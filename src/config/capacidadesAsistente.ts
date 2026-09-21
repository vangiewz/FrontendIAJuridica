import type { ContextoIntencion, IntencionLlamada } from '../services/llamada/intencion';

/**
 * CATÁLOGO ÚNICO de lo que el Asistente Jurídico puede hacer. Es la fuente de verdad de:
 *
 *   - el panel «¿Qué puedo hacer?» de la llamada y la respuesta de ayuda del chat,
 *   - la respuesta hablada (un resumen corto: la lista completa se ve en pantalla),
 *   - las ayudas parciales («¿cómo genero un contrato?», «¿cómo uso la cámara?»…).
 *
 * Nada se anuncia aquí solo porque se planeó: cada capacidad existe en el código actual (la
 * pantalla de llamada, el escáner, el generador, los reportes, el guardado y compartido, la
 * recepción de archivos y los recordatorios). Y lo que no se puede en una plataforma o build
 * concretos NO se muestra: ver `Disponibilidad` y `requiere`.
 *
 * Los ejemplos son frases reales: cada una declara la intención con que el enrutador de voz
 * (`services/llamada/intencion.ts`) debe entenderla, y una prueba lo comprueba. Si se cambia el
 * enrutador y un ejemplo deja de funcionar, la prueba falla en vez de prometer algo que no anda.
 *
 * Lógica pura y sin React Native: se prueba sola. Los textos hablan como habla la app (voseo,
 * sin jerga técnica: nada de modelos, servidores ni «STT/TTS»).
 */

export type Plataforma = 'android' | 'ios' | 'web';

/** Lo que este dispositivo y esta compilación realmente pueden hacer (lo calcula `disponibilidadAsistente`). */
export interface Disponibilidad {
  plataforma: Plataforma;
  /** Hay llamada por voz (el teléfono; en web solo existe el chat). */
  llamada: boolean;
  /** Cámara y reconocimiento de texto local (solo Android). */
  camara: boolean;
  /** Recibir archivos compartidos desde otras apps (solo Android). */
  recibir: boolean;
  /** Guardar en el teléfono y compartir con otras apps (solo Android). */
  salida: boolean;
  /** Recordatorios locales: Android CON el módulo de notificaciones en esta compilación. */
  recordatorios: boolean;
}

export type Requisito = 'camara' | 'recibir' | 'salida' | 'recordatorios';

export type IdCapacidad =
  | 'consulta' | 'documentos' | 'camara' | 'clausula' | 'analisis' | 'comparacion' | 'generacion'
  | 'reportes' | 'salida' | 'recibir' | 'recordatorios' | 'voz' | 'paneles' | 'encadenar';

/** De qué se puede pedir ayuda. `general` es todo; el resto son ayudas parciales. */
export type TemaAyuda =
  | 'general' | 'documento_activo' | 'consulta' | 'voz' | 'paneles' | 'documentos' | 'camara' | 'comparacion'
  | 'generacion' | 'reportes' | 'salida' | 'recibir' | 'archivos' | 'recordatorios';

export interface Ejemplo {
  texto: string;
  /**
   * Con qué intención de la llamada debe entender el enrutador esta frase (`consulta` = va al
   * asistente jurídico). Sin esto el ejemplo no es una frase hablada (es un gesto, como
   * «Compartir → Asistente Jurídico») y no se comprueba.
   */
  intencion?: IntencionLlamada['tipo'];
  /** Lo que la llamada debe tener para que la frase signifique eso (un documento generado, un reporte…). */
  contexto?: Partial<ContextoIntencion>;
  /** Es algo que se hace con el dedo, no una frase: se muestra sin comillas. */
  gesto?: boolean;
}

/** Lo que cambia cuando NO hay llamada (la versión web): solo el chat y las pestañas. */
export interface VarianteWeb {
  /** Si en web se llama distinto («Descargar resultados» en vez de «Guardar y compartir»). */
  titulo?: string;
  descripcion: string;
  /** Su fragmento del resumen general, si en web se dice distinto («descargar» en vez de «compartir»). */
  hablado?: string;
  ejemplos?: Ejemplo[];
  detalles?: string[];
}

export interface Capacidad {
  id: IdCapacidad;
  titulo: string;
  /** Una o dos líneas, en lenguaje de todos los días. */
  descripcion: string;
  ejemplos: Ejemplo[];
  /** Aclaraciones cortas: qué se puede y, importante, qué NO. */
  detalles?: string[];
  /** Fragmento para el resumen hablado general: «Puedo …, …, y …». Vacío = no entra en el resumen. */
  hablado: string;
  /** Lo que se dice cuando preguntan solo por esto («¿cómo genero un contrato?»). Una o dos frases. */
  explicacionHablada: string;
  /** Fragmento para «con este documento puedo …». Ausente = no aplica a un documento. */
  habladoDocumento?: string;
  temas: TemaAyuda[];
  requiere?: Requisito[];
  /** Si se pregunta por esto y aquí no está disponible. */
  noDisponible: string;
  /** Existe también sin llamada (chat y pestañas)? Si falta, en web no se muestra. */
  enWeb?: VarianteWeb;
}

const RECORDATORIO = 'recordatorio' as const;

export const CAPACIDADES: readonly Capacidad[] = [
  {
    id: 'consulta',
    titulo: 'Consultas jurídicas',
    descripcion:
      'Preguntame sobre temas jurídicos en lenguaje normal y te respondo con las fuentes normativas que encuentro. ' +
      'Soy un asistente jurídico: no reemplazo el asesoramiento de un profesional cuando el caso lo requiere.',
    ejemplos: [
      { texto: '¿Qué es la mora?', intencion: 'consulta' },
      { texto: '¿Cuál es la diferencia entre mora e incumplimiento?', intencion: 'consulta' },
      { texto: 'Explicame qué es la responsabilidad civil.', intencion: 'consulta' },
    ],
    hablado: 'responder consultas jurídicas',
    explicacionHablada:
      'Podés hacerme preguntas jurídicas en lenguaje normal, por ejemplo: «¿Qué es la mora?». ' +
      'Te respondo con las fuentes que encuentro, aunque no reemplazo el asesoramiento de un profesional cuando el caso lo requiere.',
    temas: ['consulta'],
    noDisponible: '',
    enWeb: {
      descripcion:
        'Escribime tu consulta jurídica en lenguaje normal y te respondo con las fuentes normativas que encuentro. ' +
        'Soy un asistente jurídico: no reemplazo el asesoramiento de un profesional cuando el caso lo requiere.',
    },
  },
  {
    id: 'documentos',
    titulo: 'Documentos',
    descripcion:
      'Subí un PDF, un Word o un archivo de texto (hasta 10 MB), o usá uno que ya tengas guardado, y preguntame sobre él. ' +
      'Queda activo en la conversación y respondo cada pregunta teniéndolo en cuenta.',
    ejemplos: [
      { texto: 'Quiero subir un contrato.', intencion: 'subir_documento' },
      { texto: 'Analizá este PDF.', intencion: 'subir_documento' },
      { texto: 'Revisá este documento.', intencion: 'analizar_documento', contexto: { documentoActivo: true } },
      { texto: '¿Cuál es el monto?', intencion: 'consulta' },
      { texto: '¿Quiénes son las partes?', intencion: 'consulta' },
      { texto: '¿Qué pasa si no se cumple?', intencion: 'consulta' },
    ],
    detalles: [
      'Cuando quieras dejar de usarlo, decime «cerrá el documento».',
      'Podés elegir cualquier archivo compatible o uno que ya hayas subido antes.',
    ],
    hablado: 'analizar documentos',
    explicacionHablada:
      'Podés subir un PDF, un Word o un archivo de texto y preguntarme sobre él. Decime, por ejemplo: «Quiero subir un contrato». ' +
      'Una vez cargado, respondo tus preguntas teniéndolo en cuenta.',
    habladoDocumento: 'analizarlo y responder tus preguntas sobre él',
    temas: ['documentos', 'documento_activo'],
    noDisponible: '',
    enWeb: {
      descripcion:
        'En la pestaña Documentos podés subir un PDF, un Word o un archivo de texto (hasta 10 MB) y analizarlo. ' +
        'Después elegilo con el clip del chat y preguntame sobre él.',
    },
  },
  {
    id: 'camara',
    titulo: 'Cámara y escáner',
    descripcion:
      'Fotografiá un documento en papel con la cámara del teléfono. Si tiene varias hojas, las escaneás una por una y después ' +
      'lo analizo como cualquier otro documento. También leo el texto de lo que fotografíes.',
    ejemplos: [
      { texto: 'Quiero escanear un contrato.', intencion: 'escanear' },
      { texto: 'Usá la cámara.', intencion: 'escanear' },
      { texto: 'Quiero escanear varias páginas.', intencion: 'escanear' },
    ],
    detalles: [
      'Podés escanear varias páginas y, antes de analizar, repetir una, rotarla, eliminarla o cambiarle el orden.',
      'Ves el texto que reconocí antes de enviarlo a analizar.',
      'El reconocimiento del texto se hace en tu teléfono: las fotos no salen de él; solo se envía el texto cuando pedís analizarlo.',
    ],
    hablado: 'escanear contratos con la cámara',
    explicacionHablada:
      'Podés escanear un documento en papel con la cámara del teléfono, también de varias páginas. Decime, por ejemplo: «Quiero escanear un contrato». ' +
      'Antes de analizarlo podés repetir, rotar, eliminar o reordenar las páginas, y el texto se reconoce en tu teléfono.',
    temas: ['camara'],
    requiere: ['camara'],
    noDisponible: 'La cámara y el escáner solo están disponibles en la app de Android.',
  },
  {
    id: 'clausula',
    titulo: 'Escanear una cláusula',
    descripcion:
      'Si solo te interesa un párrafo, fotografiá esa cláusula y preguntame sobre ella: la uso como contexto de tus próximas preguntas.',
    ejemplos: [
      { texto: 'Quiero preguntarte sobre esta cláusula.', intencion: 'escanear' },
      { texto: 'Escaneá esta cláusula.', intencion: 'escanear' },
      { texto: '¿Qué significa?', intencion: 'consulta' },
      { texto: '¿Ves algún riesgo?', intencion: 'consulta' },
    ],
    hablado: '',
    explicacionHablada:
      'Si solo te interesa un párrafo, decime «Escaneá esta cláusula», fotografiala y después preguntame, por ejemplo, qué significa o si ves algún riesgo.',
    temas: ['camara'],
    requiere: ['camara'],
    noDisponible: 'Escanear una cláusula solo está disponible en la app de Android.',
  },
  {
    id: 'analisis',
    titulo: 'Análisis de documentos',
    descripcion:
      'Cuando analizo un documento te muestro en pantalla lo que realmente detecto: un resumen, las partes, los montos, los plazos y las fechas, ' +
      'las cláusulas y los riesgos con su gravedad.',
    ejemplos: [
      { texto: 'Analizá este contrato.', intencion: 'analizar_documento', contexto: { documentoActivo: true } },
      { texto: 'Mostrame los riesgos.', intencion: 'mostrar' },
      { texto: 'Mostrame las cláusulas.', intencion: 'mostrar' },
      { texto: '¿Cuál es el principal riesgo?', intencion: 'consulta' },
    ],
    detalles: [
      'Solo te muestro lo que el análisis detecta en el documento: si algo no aparece, no lo invento.',
      'También detecto documentos de identidad, como cédulas o NIT, cuando figuran en el texto.',
    ],
    hablado: '',
    explicacionHablada:
      'Al analizar un documento te muestro un resumen, las partes, los montos, los plazos, las cláusulas y los riesgos que detecto. ' +
      'Decime «Analizá este contrato» y después, por ejemplo, «Mostrame los riesgos».',
    habladoDocumento: 'mostrarte sus cláusulas, sus riesgos y sus datos principales',
    temas: ['documentos', 'documento_activo'],
    noDisponible: '',
    enWeb: {
      descripcion:
        'La pestaña Documentos muestra lo que detecta el análisis: un resumen, las partes, los montos, los plazos y las fechas, ' +
        'las cláusulas y los riesgos con su gravedad.',
    },
  },
  {
    id: 'comparacion',
    titulo: 'Comparar documentos',
    descripcion:
      'Elegís dos documentos, el A y el B, y te muestro qué se agregó, qué se eliminó y qué se modificó, con una explicación de cada diferencia.',
    ejemplos: [
      { texto: 'Compará este contrato con otro.', intencion: 'comparar' },
      { texto: 'Mostrame las diferencias.', intencion: 'mostrar' },
      { texto: '¿Qué diferencias hay entre ambos?', intencion: 'comparar' },
    ],
    detalles: [
      'Si ya tenés un documento activo, ese es el primero: solo elegís o subís el segundo.',
    ],
    hablado: 'comparar documentos',
    explicacionHablada:
      'Puedo comparar dos documentos y mostrarte qué se agregó, qué se eliminó y qué cambió. Decime, por ejemplo: «Compará este contrato con otro», y elegís el segundo en pantalla.',
    habladoDocumento: 'compararlo con otro documento',
    temas: ['comparacion', 'documento_activo'],
    noDisponible: '',
    enWeb: {
      descripcion:
        'En la pestaña Comparar elegís dos documentos y ves qué se agregó, qué se eliminó y qué se modificó, con una explicación de cada diferencia.',
    },
  },
  {
    id: 'generacion',
    titulo: 'Generar documentos',
    descripcion:
      'Puedo redactarte un borrador de contrato de compraventa, de arrendamiento o de préstamo. Si faltan datos te los voy preguntando, ' +
      'y después podés pedir cambios y preparo una versión nueva.',
    ejemplos: [
      { texto: 'Generame un contrato de préstamo.', intencion: 'generar_documento' },
      { texto: 'Preparame un contrato de arrendamiento.', intencion: 'generar_documento' },
      { texto: 'Redactá un contrato de compraventa.', intencion: 'generar_documento' },
      { texto: 'Cambiá el plazo a 18 meses.', intencion: 'modificar_generado', contexto: { generado: true } },
    ],
    detalles: [
      'Solo redacto esos tres tipos de contrato: compraventa, arrendamiento y préstamo.',
      'Si un dato no lo tenés, decime «omitir» y queda marcado como pendiente en el borrador.',
      'Cada cambio genera una versión nueva; la anterior se conserva.',
    ],
    hablado: 'generar contratos',
    explicacionHablada:
      'Puedo redactarte un borrador de contrato de compraventa, arrendamiento o préstamo. Decime, por ejemplo: «Generame un contrato de préstamo». ' +
      'Te voy a preguntar lo que falte, y después podés pedirme cambios, como «Cambiá el plazo a 18 meses».',
    temas: ['generacion'],
    noDisponible: '',
    enWeb: {
      descripcion:
        'En la pestaña Generar elegís entre contratos de compraventa, arrendamiento y préstamo, completás los datos y obtenés un borrador. ' +
        'Solo redacto esos tres tipos.',
    },
  },
  {
    id: 'reportes',
    titulo: 'Reportes',
    descripcion:
      'Pedime un reporte en lenguaje normal y lo armo con tus datos, como tabla, resumen o gráfico de barras o de torta. ' +
      'Después podés ajustarlo y exportarlo a PDF, Word, Excel o PowerPoint.',
    ejemplos: [
      { texto: 'Generame un reporte.', intencion: 'reporte' },
      { texto: 'Generame un reporte de mis documentos.', intencion: 'reporte' },
      { texto: 'Mostralo como gráfico.', intencion: 'reporte', contexto: { reporte: true } },
    ],
    hablado: 'preparar reportes',
    explicacionHablada:
      'Puedo armar reportes con tus datos, como tabla, resumen o gráfico. Decime, por ejemplo: «Generame un reporte de mis documentos», y después «Mostralo como gráfico».',
    temas: ['reportes'],
    noDisponible: '',
    enWeb: {
      descripcion:
        'En la pestaña Reportes armás reportes con tus datos, como tabla, resumen o gráfico de barras o de torta, y los descargás en PDF, Word, Excel o PowerPoint.',
    },
  },
  {
    id: 'salida',
    titulo: 'Guardar y compartir',
    descripcion:
      'Los documentos que genero y los reportes los podés guardar en tu teléfono, eligiendo la carpeta, o compartirlos con las aplicaciones ' +
      'que tengas instaladas, por ejemplo WhatsApp, Gmail o Drive.',
    ejemplos: [
      { texto: 'Guardá este documento.', intencion: 'salida', contexto: { generado: true } },
      { texto: 'Guardá el reporte.', intencion: 'salida', contexto: { reporte: true } },
      { texto: 'Compartí este documento.', intencion: 'salida', contexto: { generado: true } },
      { texto: 'Compartí el reporte.', intencion: 'salida', contexto: { reporte: true } },
    ],
    detalles: [
      'Al compartir, Android te muestra las aplicaciones compatibles que tengas instaladas.',
      'Cuando el resultado se ofrece en varios formatos, como PDF o Word, elegís el que querés.',
    ],
    hablado: 'guardar o compartir los resultados',
    explicacionHablada:
      'Los documentos que genero y los reportes los podés guardar en tu teléfono, eligiendo dónde, o compartirlos con las aplicaciones que tengas instaladas. ' +
      'Decime, por ejemplo: «Guardá este documento» o «Compartí el reporte».',
    temas: ['salida', 'archivos'],
    requiere: ['salida'],
    noDisponible: 'Guardar y compartir desde la llamada solo está disponible en la app de Android.',
    enWeb: {
      titulo: 'Descargar resultados',
      descripcion:
        'En las pestañas Generar y Reportes descargás el resultado a tu equipo: los documentos en PDF o Word y los reportes también en Excel o PowerPoint.',
      hablado: 'descargar los resultados',
    },
  },
  {
    id: 'recibir',
    titulo: 'Recibir documentos de otras apps',
    descripcion:
      'Si te llega un PDF o un Word por WhatsApp, Gmail, Drive o Archivos, compartilo con Asistente Jurídico desde esa app. ' +
      'Te pregunto si querés que lo analice: no lo hago sin que me lo confirmes.',
    ejemplos: [
      { texto: 'Compartir → Asistente Jurídico', gesto: true },
    ],
    detalles: [
      'Sirve desde cualquier aplicación que tenga la opción Compartir.',
      'Si te mandan un contrato por WhatsApp, lo compartís conmigo y sigo desde ahí, dentro de la llamada.',
    ],
    hablado: 'recibir archivos de otras aplicaciones',
    explicacionHablada:
      'Si te mandan un contrato por WhatsApp o por correo, tocá Compartir y elegí Asistente Jurídico. Yo te pregunto si querés que lo analice.',
    temas: ['recibir', 'archivos'],
    requiere: ['recibir'],
    noDisponible: 'Recibir archivos de otras aplicaciones solo está disponible en la app de Android.',
  },
  {
    id: 'recordatorios',
    titulo: 'Recordatorios',
    descripcion:
      'Puedo crear recordatorios para una fecha y hora, o que se repitan a diario, por semana o por mes. Antes de crear cualquiera te muestro ' +
      'la fecha y la hora y te pido que confirmes: nada se programa sin tu confirmación.',
    ejemplos: [
      { texto: 'Recordame revisar este contrato mañana.', intencion: RECORDATORIO },
      { texto: 'Avisame una semana antes del vencimiento.', intencion: RECORDATORIO },
      { texto: 'Recordame pagar el día 15 de cada mes.', intencion: RECORDATORIO },
      { texto: '¿Qué recordatorios tengo?', intencion: RECORDATORIO },
      { texto: 'Cancelá el recordatorio.', intencion: RECORDATORIO },
      { texto: 'Cambiá el recordatorio para mañana a las 4.', intencion: RECORDATORIO },
    ],
    detalles: [
      'Los recordatorios quedan programados en tu teléfono, así que pueden avisarte aunque no tengas abierta la aplicación.',
      'No calculo plazos jurídicos complejos, como días hábiles o feriados: si el plazo los usa, decime la fecha exacta.',
      'Solo te ofrezco fechas que realmente aparecen en el documento analizado, y nunca creo un recordatorio por mi cuenta.',
    ],
    hablado: 'crear recordatorios',
    explicacionHablada:
      'Puedo crear recordatorios. Decime, por ejemplo: «Recordame revisar este contrato mañana». Siempre te muestro la fecha y la hora y te pido que confirmes antes de crearlo. ' +
      'Quedan programados en tu teléfono, y también podés pedirme verlos, cambiarlos o cancelarlos.',
    habladoDocumento: 'crear recordatorios con sus fechas',
    temas: ['recordatorios', 'documento_activo'],
    requiere: ['recordatorios'],
    noDisponible:
      'Los recordatorios solo están disponibles en la app de Android, y cuando esta versión tiene activadas las notificaciones.',
  },
  {
    id: 'voz',
    titulo: 'Conversación por voz',
    descripcion:
      'Podés hablarme normalmente y yo te respondo por voz, sin volver al chat. Si querés cortarme mientras hablo, tocá Interrumpir y seguí vos.',
    ejemplos: [
      { texto: 'Solo hablame normalmente.' },
    ],
    detalles: [
      'Podés interrumpirme mientras estoy hablando, tocando el micrófono.',
      'También podés silenciar el micrófono y volver a activarlo cuando quieras.',
    ],
    hablado: '',
    explicacionHablada:
      'Podés hablarme normalmente y yo te respondo por voz. Si querés cortarme mientras hablo, tocá el micrófono para interrumpirme y seguí vos.',
    temas: ['voz'],
    noDisponible: 'La conversación por voz solo está disponible en la app del celular.',
  },
  {
    id: 'paneles',
    titulo: 'Respuestas, fuentes y vistas previas',
    descripcion:
      'Además de escucharme, podés ver en pantalla la respuesta completa, sus fuentes, el documento y su análisis, las comparaciones, los reportes ' +
      'y los documentos generados, sin salir de la llamada. Mientras mirás el panel, sigo hablando.',
    ejemplos: [
      { texto: 'Mostrame las fuentes.', intencion: 'mostrar' },
      { texto: 'Mostrame la respuesta completa.', intencion: 'mostrar' },
      { texto: 'Cerrá el panel.', intencion: 'panel' },
    ],
    detalles: [
      'Desde las fuentes podés abrir cada artículo citado.',
    ],
    hablado: '',
    explicacionHablada:
      'Además de escucharme, podés ver la respuesta completa y sus fuentes en pantalla. Decime «Mostrame las fuentes» o «Mostrame la respuesta completa», y seguí escuchándome mientras las mirás.',
    temas: ['paneles'],
    noDisponible: 'Los paneles de la llamada solo están disponibles en la app del celular.',
  },
  {
    id: 'encadenar',
    titulo: 'Todo en la misma llamada',
    descripcion:
      'No son asistentes separados: soy un único Asistente Jurídico, y podés pedirme una cosa detrás de otra sin salir de la llamada.',
    ejemplos: [
      { texto: 'Analizá este contrato.', intencion: 'analizar_documento', contexto: { documentoActivo: true } },
      { texto: '¿Cuál es el principal riesgo?', intencion: 'consulta' },
      { texto: 'Compará este contrato con otro.', intencion: 'comparar' },
      { texto: 'Generame un reporte.', intencion: 'reporte' },
    ],
    hablado: '',
    explicacionHablada: '',
    temas: [],
    noDisponible: '',
  },
];
