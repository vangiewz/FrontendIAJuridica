import type { TemaAyuda } from '../../config/capacidadesAsistente';
import { aPlano, re } from './intencionBase';

export type { TemaAyuda };

/**
 * Cuándo una frase es una pregunta SOBRE LA APP («¿qué podés hacer?», «¿cómo genero un contrato?») y
 * no una consulta jurídica. Lógica pura, sin React Native, y sin modelo: se resuelve en el teléfono, al
 * instante, sin gastar una consulta al asistente jurídico ni depender del servidor.
 *
 * Lo difícil no es reconocer «¿qué podés hacer?» sino NO robarle frases al asistente jurídico:
 *   «¿Qué puede hacer un acreedor si no le pagan?»  →  consulta.
 *   «¿Qué puedo hacer si incumplen mi contrato?»    →  consulta.
 * Por eso cada regla está ANCLADA a la frase entera (no busca palabras sueltas) y solo calza si:
 *   - le habla al asistente en segunda persona («¿qué podés hacer?», «¿en qué me podés ayudar?»), o
 *   - nombra la app o al asistente («con vos», «esta app», «aquí»), o
 *   - habla de algo que solo existe en la app («la cámara», «un recordatorio», «te comparto un PDF»).
 * Una frase con un complemento que no es de la app («…si no le pagan», «…con mi contrato de alquiler»)
 * no termina donde debe y sigue siendo una consulta. En la duda, gana la consulta.
 */

export interface ContextoAyuda {
  /** Hay un documento activo: «¿qué puedo hacer con este documento?» habla de ÉL. */
  documentoActivo: boolean;
}

// Cortesías y pedidos que pueden preceder a la pregunta: «hola, decime qué podés hacer».
const CORTESIA =
  '^(?:(?:hola|buenas|por favor|porfa|entonces|bueno|ok|oye|che|disculpa|perdon|a ver|y|pero|ahora|dale)\\s+)*';
const PEDIR =
  '(?:(?:podes|puedes|podrias)\\s+)?(?:(?:decime|dime|decirme|contame|cuentame|contarme|explicame|explicarme|' +
  'mostrame|muestrame|mostrarme|ensename|ensenarme|indicame|listame)\\s+)?';
const INICIO = CORTESIA + PEDIR;

/** Cómo se refiere a la app o al asistente: «con vos», «acá», «esta app». */
const A_LA_APP =
  '(?:\\s+(?:con\\s+(?:vos|voz|ti|contigo|el asistente|este asistente|esta app|la app|esta aplicacion|la aplicacion)|' +
  'vos|tu|usted|aca|aqui|en esta app|en la app|en esta aplicacion|en la aplicacion|por mi|conmigo|hoy))?';

/** «Cómo uso esto / la app / el asistente»: el objeto es la propia app. */
const OBJ_APP =
  '(?:\\s+(?:esto|esta app|la app|el asistente|este asistente|la aplicacion|esta aplicacion|el sistema))?';

const FIN = '$';
const regla = (cuerpo: string) => re(`${INICIO}(?:${cuerpo})${FIN}`);

// ── Ayuda general ───────────────────────────────────────────────────────────────────────
// Segunda persona: le pregunta al asistente qué sabe hacer. La 1.ª persona («¿qué puedo hacer?») NO entra
// sola: es demasiado parecida a una pregunta jurídica («¿y qué puedo hacer?»).
const GENERAL = [
  regla(`(?:todo\\s+)?(?:lo\\s+)?que\\s+(?:cosas\\s+)?(?:podes|puedes|sabes|sos capaz de)\\s+hacer${A_LA_APP}`),
  regla(`que\\s+(?:cosas\\s+)?puedo\\s+hacer\\s+(?:con\\s+(?:vos|voz|ti|contigo|el asistente|este asistente|esta app|la app|esta aplicacion|la aplicacion)|` +
    'aca|aqui|en esta app|en la app|en esta aplicacion)'),
  regla(`que\\s+(?:cosas\\s+)?(?:te\\s+)?puedo\\s+(?:pedir|preguntar|decir|solicitar)(?:te)?${A_LA_APP}`),
  regla('que\\s+se\\s+puede\\s+(?:hacer|pedir)\\s+(?:aca|aqui|con esta app|con la app|con el asistente|con esta aplicacion)'),
  regla('como\\s+(?:te\\s+)?(?:uso|utilizo|usas|usarte|utilizarte|puedo usarte|puedo utilizarte|se usa|funcionas|hago para usarte)' +
    `${A_LA_APP}${OBJ_APP}`),
  regla('como\\s+funciona\\s+(?:esto|todo esto|esta app|la app|el asistente|este asistente|la aplicacion|esta aplicacion|la llamada)'),
  regla('como\\s+(?:se\\s+)?(?:usa|utiliza)\\s+(?:esto|esta app|la app|el asistente|este asistente|la aplicacion|esta aplicacion)'),
  regla('(?:todas\\s+)?(?:tus|las)\\s+(?:funciones|funcionalidades|capacidades|habilidades)(?:\\s+(?:del asistente|de la app|de la aplicacion))?'),
  regla('cuales\\s+son\\s+(?:todas\\s+)?(?:tus|las)\\s+(?:funciones|funcionalidades|capacidades|habilidades)'),
  regla('cuales\\s+son\\s+tus\\s+opciones'),
  regla('que\\s+(?:funciones|funcionalidades|capacidades|opciones|habilidades)\\s+(?:tenes|tienes)'),
  regla('(?:en|con)\\s+que\\s+(?:cosas\\s+)?(?:me\\s+)?(?:podes|puedes)\\s+ayudar(?:me)?'),
  regla('como\\s+(?:me\\s+)?(?:podes|puedes)\\s+ayudar(?:me)?'),
  regla('(?:ayuda|ayudame|necesito ayuda|quiero ayuda|pido ayuda)'),
  regla('(?:ayudame|necesito ayuda|quiero ayuda)\\s+(?:a|con|para)\\s+(?:usar|utilizar|entender|manejar)?\\s*(?:el\\s+asistente|este\\s+asistente|la\\s+app|esta\\s+app|la\\s+aplicacion|esta\\s+aplicacion|esto|el\\s+sistema)'),
  regla('ayuda\\s+(?:con|sobre|de)\\s+(?:la\\s+app|el\\s+asistente|la\\s+aplicacion|esto|el\\s+uso)'),
];

// ── El documento activo ─────────────────────────────────────────────────────────────────
const DOC_SINGULAR = '(?:este|ese|esta|el|mi)\\s+(?:documento|contrato|archivo|pdf|acuerdo|convenio|escaneo)';
const SOBRE_DOC_2A = regla(`que\\s+(?:cosas\\s+)?(?:podes|puedes|sabes)\\s+hacer\\s+con\\s+${DOC_SINGULAR}`);
// «¿Qué puedo hacer con este contrato?» también puede ser una pregunta jurídica: solo habla de la app
// si hay un documento activo (que es lo que el usuario tiene entre manos).
const SOBRE_DOC_1A = regla(`que\\s+(?:cosas\\s+)?(?:puedo|podemos|se puede)\\s+hacer\\s+con\\s+${DOC_SINGULAR}`);
const PEDIR_SOBRE_DOC = regla(`que\\s+(?:cosas\\s+)?(?:te\\s+)?puedo\\s+(?:pedir|preguntar|decir)(?:te)?\\s+(?:sobre|de|con|acerca de)\\s+${DOC_SINGULAR}`);

// ── Ayudas parciales ────────────────────────────────────────────────────────────────────
const CON_VOS = '(?:\\s+(?:con vos|contigo|con el asistente|con esta app|con la app|aca|aqui|con esta aplicacion))?';
const ART = '(?:los\\s+|las\\s+|mis\\s+|tus\\s+|el\\s+|la\\s+|un\\s+|una\\s+|mi\\s+|tu\\s+)?';

interface Tema {
  tema: TemaAyuda;
  /** El sustantivo del tema tal como se le pregunta al asistente («qué podés hacer con la cámara»). */
  sustantivo: string;
  /**
   * El sustantivo cuando la frase NO le habla al asistente en segunda persona («qué puedo hacer con…»,
   * «cómo funciona…»): solo palabras que son de la app. Sin esto, «¿cómo funcionan los contratos?» sería ayuda.
   */
  uso: string;
  /** «¿Cómo genero un contrato?»: el verbo en primera persona y lo que se hace con él. */
  como: string[];
}

const TEMAS: Tema[] = [
  {
    tema: 'recibir', sustantivo: '(?:archivos recibidos|recibir archivos|recibir documentos|recepcion de archivos)',
    uso: '(?:archivos recibidos|recibir archivos|recibir documentos|recepcion de archivos)',
    como: [
      `te\\s+(?:comparto|mando|envio|paso|subo|cargo)\\s+(?:un\\s+|el\\s+|mi\\s+|este\\s+)?(?:pdf|word|documento|contrato|archivo|docx)s?${CON_VOS}`,
      'hago\\s+para\\s+(?:pasarte|mandarte|compartirte|enviarte)\\s+(?:un\\s+|el\\s+|mi\\s+)?(?:pdf|word|documento|contrato|archivo)s?',
      '(?:recibis|recibes)\\s+(?:archivos|documentos|pdfs?|contratos)',
      'recibo\\s+(?:un\\s+|el\\s+)?(?:pdf|documento|contrato|archivo)s?\\s+(?:por|de|desde)\\s+(?:whatsapp|gmail|correo|drive|otra app|otras apps)',
    ],
  },
  {
    tema: 'salida', sustantivo: '(?:guardar|compartir|guardar y compartir|exportar|descargar)',
    uso: '(?:guardar|compartir|guardar y compartir|exportar|descargar)',
    como: [
      `(?:guardo|comparto|exporto|descargo)\\s+(?:un\\s+|el\\s+|mi\\s+|los\\s+|este\\s+)?(?:documento generado|documento|reporte|informe|archivo|pdf|resultado|resultados|borrador|contrato generado)s?${CON_VOS}`,
      '(?:envio|mando|comparto)\\s+(?:un\\s+|el\\s+|mi\\s+|este\\s+)?(?:documento|reporte|informe|archivo|pdf|borrador)s?\\s+por\\s+(?:whatsapp|gmail|correo|mail|email|drive)',
    ],
  },
  {
    tema: 'recordatorios', sustantivo: '(?:recordatorios|avisos|alertas|notificaciones|recordatorio)',
    uso: '(?:recordatorios|recordatorio|notificaciones)',
    como: [
      `(?:creo|programo|agendo|pongo|configuro|hago|agrego|edito|cancelo|cambio|borro|elimino|veo|consulto|uso)\\s+(?:un\\s+|el\\s+|los\\s+|mis\\s+|una\\s+|unos\\s+)?(?:recordatorios?|avisos?|alertas?)(?:\\s+(?:de|del)\\s+(?:vencimiento|pago|contrato|documento))?${CON_VOS}`,
      'me\\s+(?:avisas|recordas|recuerdas)\\s+(?:de\\s+)?(?:un\\s+|los\\s+)?(?:vencimientos?|pagos?|fechas?)',
    ],
  },
  {
    tema: 'camara', sustantivo: '(?:camara|escaner|escaneo|escanear|escaneos|ocr|fotos|fotografias|escanear documentos)',
    uso: '(?:camara|escaner|escaneo|escanear|escaneos|ocr|escanear documentos)',
    como: [
      `(?:escaneo|digitalizo|fotografio|saco|tomo|uso)\\s+(?:un\\s+|el\\s+|mi\\s+|una\\s+|la\\s+)?(?:documento|contrato|clausula|foto|fotografia|camara|escaner|hoja|pagina|paginas|hojas)s?${CON_VOS}`,
      `(?:escaneo|digitalizo|fotografio)\\s+(?:varias\\s+)?(?:paginas|hojas)${CON_VOS}`,
    ],
  },
  {
    tema: 'comparacion', sustantivo: '(?:comparaciones|comparar|comparar documentos|comparar contratos|comparacion)',
    uso: '(?:comparaciones|comparar documentos|comparar contratos|comparacion)',
    como: [
      `(?:comparo|comparar)\\s+(?:dos\\s+|2\\s+|estos dos\\s+|los dos\\s+|mis\\s+)?(?:contratos|documentos|archivos|pdfs?)${CON_VOS}`,
    ],
  },
  {
    tema: 'generacion', sustantivo: '(?:generar|generacion|generar documentos|generar contratos|contratos generados|borradores|redactar|redaccion)',
    uso: '(?:generacion|generar documentos|generar contratos|contratos generados|borradores)',
    como: [
      `(?:genero|generar|puedo generar)\\s+(?:un\\s+|el\\s+|una\\s+)?(?:contrato|documento|borrador|carta)(?:\\s+de\\s+(?:prestamo|arrendamiento|alquiler|compraventa))?${CON_VOS}`,
      `(?:creo|armo|redacto|preparo|elaboro|hago|puedo crear|puedo redactar)\\s+(?:un\\s+|el\\s+|una\\s+)?(?:contrato|documento|borrador|carta)(?:\\s+de\\s+(?:prestamo|arrendamiento|alquiler|compraventa))?\\s+(?:con vos|contigo|con el asistente|con esta app|con la app|aca|aqui|con esta aplicacion)`,
    ],
  },
  {
    tema: 'reportes', sustantivo: '(?:reportes|informes|graficos|reporte|informe)',
    uso: '(?:reportes|reporte|graficos)',
    como: [
      `(?:genero|creo|armo|pido|saco|puedo generar|puedo pedir)\\s+(?:un\\s+|el\\s+|una\\s+|mis\\s+)?(?:reportes?|graficos?)${CON_VOS}`,
      `(?:genero|creo|armo|pido|saco|hago|puedo generar|puedo pedir)\\s+(?:un\\s+|el\\s+|una\\s+|mis\\s+)?(?:reportes?|informes?|graficos?)\\s+(?:con vos|contigo|con el asistente|con esta app|con la app|aca|aqui|con esta aplicacion)`,
    ],
  },
  {
    tema: 'documentos', sustantivo: '(?:documentos|archivos|contratos|pdfs?|documentos legales|documentos juridicos)',
    uso: '(?:documentos|archivos|pdfs?)',
    como: [
      `(?:subo|cargo|adjunto)\\s+(?:un\\s+|el\\s+|mi\\s+|una\\s+)?(?:documento|contrato|archivo|pdf|word)s?${CON_VOS}`,
      // «¿Cómo analizo un contrato?» a secas puede ser una pregunta jurídica: solo es ayuda si nombra la app.
      '(?:analizo|reviso|leo)\\s+(?:un\\s+|el\\s+|mi\\s+|una\\s+)?(?:documento|contrato|archivo|pdf|word)s?\\s+(?:con vos|contigo|con el asistente|con esta app|con la app|aca|aqui|con esta aplicacion)',
    ],
  },
  {
    tema: 'paneles', sustantivo: '(?:fuentes|paneles|vistas previas|el panel)',
    uso: '(?:paneles|vistas previas|el panel)',
    como: [
      '(?:veo|puedo ver|miro)\\s+(?:las\\s+)?(?:fuentes|la respuesta completa|los articulos|el articulo|la respuesta)',
    ],
  },
  {
    tema: 'voz', sustantivo: '(?:conversacion por voz|llamada|la llamada)',
    uso: '(?:conversacion por voz|llamada|la llamada)',
    como: [
      '(?:te\\s+)?(?:hablo|interrumpo|silencio)',
      'puedo\\s+(?:hablarte|interrumpirte|silenciarte)',
    ],
  },
];

// «¿Qué podés hacer con documentos?» le habla al asistente (cualquier sustantivo del tema sirve); «¿qué puedo hacer
// con…?» solo con palabras propias de la app.
const CAP_TEMA = (t: Tema) => regla(
  `(?:que|cuales)\\s+(?:cosas\\s+)?(?:funciones\\s+)?(?:(?:podes|puedes|sabes)\\s+(?:hacer|usar)\\s+(?:con|en|para|sobre)\\s+${ART}${t.sustantivo}` +
  `|(?:puedo|se puede|podemos)\\s+(?:hacer|usar)\\s+(?:con|en|para|sobre)\\s+${ART}${t.uso})${CON_VOS}`);
const USO_TEMA = (t: Tema) => regla(
  `como\\s+(?:te\\s+)?(?:uso|utilizo|usar|se usa|se usan|usas|puedo usar|funciona|funcionan|hago para usar)\\s+${ART}${t.uso}${CON_VOS}`);
const COMO_TEMA = (t: Tema) => regla(`(?:como|de que (?:forma|manera))\\s+(?:se\\s+)?(?:${t.como.join('|')})`);
const PEDIR_TEMA = (t: Tema) => regla(
  `que\\s+(?:cosas\\s+)?(?:te\\s+)?puedo\\s+(?:pedir|preguntar|decir)(?:te)?\\s+(?:sobre|de|con|acerca de)\\s+${ART}${t.uso}`);

const REGLAS_TEMA = TEMAS.map((t) => ({
  tema: t.tema, reglas: [CAP_TEMA(t), USO_TEMA(t), COMO_TEMA(t), PEDIR_TEMA(t)],
}));

/** El tema de ayuda de una frase ya normalizada (`aPlano`), o `null` si NO es una pregunta sobre la app. */
export function detectarTemaAyuda(plano: string, ctx: ContextoAyuda): TemaAyuda | null {
  if (!plano) return null;

  // El documento activo va antes que el resto: «con este documento» es MÁS específico que «con documentos».
  if (SOBRE_DOC_2A.test(plano) || PEDIR_SOBRE_DOC.test(plano)) return ctx.documentoActivo ? 'documento_activo' : 'documentos';
  if (SOBRE_DOC_1A.test(plano)) return ctx.documentoActivo ? 'documento_activo' : null;

  if (GENERAL.some((r) => r.test(plano))) return 'general';
  for (const { tema, reglas } of REGLAS_TEMA) {
    if (reglas.some((r) => r.test(plano))) return tema;
  }
  return null;
}

/** Lo mismo para una frase tal como la escribió o dijo el usuario (chat y llamada usan esta). */
export function detectarAyudaEnTexto(texto: string, ctx: ContextoAyuda): TemaAyuda | null {
  return detectarTemaAyuda(aPlano(texto), ctx);
}
