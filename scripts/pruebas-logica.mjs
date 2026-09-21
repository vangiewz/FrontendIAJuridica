// Pruebas de la lógica pura de la app móvil (sin dispositivo, sin red, sin Expo).
//
//   npm run test:logica
//
// Compila con `tsc` solo los módulos que no dependen de React Native y los ejercita con
// `node:assert`. Cubre: resolución de la URL del backend, texto para leer en voz alta,
// elección de idioma y errores del dictado, y etapas del análisis.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = resolve(fileURLToPath(new URL('..', import.meta.url)));
// Dentro del repo, no en el tmp del sistema: los modulos compilados hacen `require` de
// paquetes del proyecto y desde fuera no resolverian node_modules. Lo ignora .gitignore.
const salida = mkdtempSync(join(raiz, '.test-out-'));
const tsc = join(raiz, 'node_modules', 'typescript', 'bin', 'tsc');

const modulos = [
  'src/services/resolverBaseUrl.ts',
  'src/services/voz/textoLectura.ts',
  'src/services/voz/dictadoPuro.ts',
  'src/components/consultas/etapas.ts',
  'src/components/consultas/analizarTexto.ts',
  'src/components/avatar/estados.ts',
  'src/services/persistencia/claves.ts',
  'src/services/sync/backoff.ts',
  'src/services/sync/clasificarError.ts',
  'src/models/consultas/esquemas.ts',
  'src/models/normativa/corpus.ts',
  'src/services/llamada/intencion.ts',
  'src/services/llamada/resumenVoz.ts',
  'src/services/escaner/escanerPuro.ts',
  'src/services/archivos/tiposArchivo.ts',
  'src/services/archivos/pantallaSistemaPuro.ts',
  'src/services/recordatorios/fechas.ts',
  'src/services/recordatorios/interpretar.ts',
  'src/services/recordatorios/modelo.ts',
  'src/services/recordatorios/propuesta.ts',
];

try {
  execFileSync(process.execPath, [tsc, '--ignoreConfig', ...modulos, '--outDir', salida,
    '--module', 'commonjs', '--target', 'es2022', '--skipLibCheck', '--strict', '--rootDir', 'src'],
  { cwd: raiz, stdio: 'inherit' });
} catch {
  rmSync(salida, { recursive: true, force: true });
  console.error('No compilaron los módulos puros.');
  process.exit(1);
}

const cargar = createRequire(join(salida, 'x.js'));
const { resolverBaseUrl, describirServidor } = cargar('./services/resolverBaseUrl');
const { textoParaLectura, dividirEnTramos, limpiarParaVoz } = cargar('./services/voz/textoLectura');
const { elegirIdioma, clasificarError, mensajeDescarga, MENSAJES_DICTADO } = cargar('./services/voz/dictadoPuro');
const { pasoDeEtapa } = cargar('./components/consultas/etapas');
const { analizarTexto } = cargar('./components/consultas/analizarTexto');
const { resolverEstadoAvatar, estadoAvatarDelPanel, ETIQUETA_AVATAR, TEXTO_ESTADO } = cargar('./components/avatar/estados');
const { detectarIntencionLlamada, aPlano } = cargar('./services/llamada/intencion');
const {
  nombreHablado, primerasOraciones, resumenAnalisis, resumenComparacion, resumenGenerado,
  resumenReporte, preguntaDeCampo, resumenEscaneo,
} = cargar('./services/llamada/resumenVoz');
const {
  armarTextoOcr, armarTextoEscaneo, evaluarSuficiencia, estadoDeTexto, moverPagina, tamanoDestino,
  nombreArchivoEscaneo, nombreArchivoClausula, componerConsultaConClausula, contarCaracteresUtiles,
  MINIMO_CARACTERES_DOCUMENTO, LADO_MAXIMO_PX,
} = cargar('./services/escaner/escanerPuro');
const {
  MIME_POR_EXTENSION, mimeDeFormato, mimeDeArchivo, conExtension, nombreUnico, extensionDeNombre,
  normalizarRecibido, describirArchivo, claveDeRecepcion, esShareRepetido, MENSAJES_RECEPCION,
} = cargar('./services/archivos/tiposArchivo');
const { crearLiberador } = cargar('./services/archivos/pantallaSistemaPuro');
const F = cargar('./services/recordatorios/fechas');
const { interpretarRecordatorio, resolverInterpretacion, numeroDe } = cargar('./services/recordatorios/interpretar');
const M = cargar('./services/recordatorios/modelo');
const P = cargar('./services/recordatorios/propuesta');
const appJson = JSON.parse(readFileSync(join(raiz, 'app.json'), 'utf8'));

let total = 0;
const ok = (nombre, prueba) => { prueba(); total += 1; console.log('  ok  ', nombre); };

try {
  console.log('--- URL del backend ---');
  ok('la variable explícita gana y pierde la barra final', () =>
    assert.equal(resolverBaseUrl({ variable: 'http://10.0.0.5:9000/', hostUri: '192.168.1.23:8081', plataforma: 'android' }), 'http://10.0.0.5:9000'));
  ok('celular sin variable: host de Metro y puerto 8000', () =>
    assert.equal(resolverBaseUrl({ variable: undefined, hostUri: '192.168.1.23:8081', plataforma: 'android' }), 'http://192.168.1.23:8000'));
  ok('development build (hostUri con esquema) también sirve', () =>
    assert.equal(resolverBaseUrl({ variable: '', hostUri: 'http://192.168.1.23:8081/x', plataforma: 'android' }), 'http://192.168.1.23:8000'));
  ok('variable vacía o con espacios cuenta como no definida', () =>
    assert.equal(resolverBaseUrl({ variable: '   ', hostUri: '192.168.1.23:8081', plataforma: 'ios' }), 'http://192.168.1.23:8000'));
  ok('web usa localhost aunque haya hostUri', () =>
    assert.equal(resolverBaseUrl({ variable: '', hostUri: '192.168.1.23:8081', plataforma: 'web' }), 'http://localhost:8000'));
  ok('el túnel de Expo NO se toma como backend', () =>
    assert.equal(resolverBaseUrl({ variable: '', hostUri: 'abc-anonymous-8081.exp.direct:80', plataforma: 'android' }), 'http://localhost:8000'));
  ok('sin hostUri (build de producción) cae a localhost', () =>
    assert.equal(resolverBaseUrl({ variable: '', hostUri: null, plataforma: 'android' }), 'http://localhost:8000'));
  ok('describirServidor no expone esquema ni ruta', () =>
    assert.equal(describirServidor('http://192.168.1.23:8000/api'), '192.168.1.23:8000'));

  console.log('--- Texto para leer en voz alta ---');
  const respuesta = [
    '**Tu situación**', 'Firmaste un contrato de alquiler (art. 711) por un año.', '',
    '**Análisis**', 'Según los arts. 711 y 712, el adquirente respeta el arrendamiento (F1C1, F4C1).', '',
    '**Qué deberías revisar**', '- el plazo del contrato', '- la cláusula de terminación', '',
    '**Citas**', 'F1C1, F4C1, F727C2',
  ].join('\n');
  const leido = textoParaLectura(respuesta);
  ok('sin asteriscos ni identificadores internos', () => {
    assert.ok(!/[*#]/.test(leido));
    assert.ok(!/\bF\d+C?\d*\b/.test(leido));
  });
  ok('«art.» y «arts.» se leen como palabras', () => {
    assert.ok(leido.includes('artículo 711'));
    assert.ok(leido.includes('artículos 711 y 712'));
  });
  ok('títulos y viñetas terminan en punto (pausa de la voz)', () => {
    assert.ok(leido.includes('Tu situación.'));
    assert.ok(leido.includes('el plazo del contrato.'));
  });
  ok('no quedan paréntesis vacíos ni enlaces', () => {
    assert.ok(!/\(\s*\)/.test(leido));
    assert.equal(limpiarParaVoz('Ver https://ejemplo.com/x ahora'), 'Ver ahora');
  });

  console.log('--- División en tramos ---');
  const parrafo = (i) => `Parrafo ${i}. ${'palabra '.repeat(120).trim()}.`;
  const largo = Array.from({ length: 10 }, (_, i) => parrafo(i)).join('\n\n');
  const tramos = dividirEnTramos(largo, 3000);
  ok('ningún tramo excede el límite y no se pierde texto', () => {
    tramos.forEach((t) => assert.ok(t.length <= 3000));
    assert.equal(tramos.join(' ').replace(/\s+/g, ' '), largo.replace(/\s+/g, ' '));
  });
  ok('un párrafo gigante se corta en oraciones, nunca a mitad de palabra', () => {
    const gigante = Array.from({ length: 400 }, (_, i) => `Oracion numero ${i} del texto.`).join(' ');
    const partes = dividirEnTramos(gigante, 1000);
    assert.ok(partes.length > 1);
    partes.forEach((t) => { assert.ok(t.length <= 1000); assert.match(t, /[.]$/); });
  });
  ok('una palabra sin espacios mayor al límite se corta igual (último recurso)', () => {
    const partes = dividirEnTramos('x'.repeat(2500), 1000);
    assert.ok(partes.every((t) => t.length <= 1000));
    assert.equal(partes.join('').length, 2500);
  });
  ok('texto vacío no genera tramos', () => assert.deepEqual(dividirEnTramos('  \n\n '), []));

  console.log('--- Dictado: idioma, errores y descarga ---');
  ok('prefiere el español instalado (local) y normaliza es_MX', () =>
    assert.deepEqual(elegirIdioma(['en-US', 'es-ES', 'es-BO'], ['es_MX', 'en-US']), { lang: 'es-MX', enDispositivo: true }));
  ok('entre los instalados prefiere es-BO', () =>
    assert.equal(elegirIdioma([], ['es-ES', 'es-BO']).lang, 'es-BO'));
  ok('sin español instalado: usa el soportado y declara que NO es local', () =>
    assert.deepEqual(elegirIdioma(['en-US', 'es-US'], ['en-US']), { lang: 'es-US', enDispositivo: false }));
  ok('Android 12- (listas vacías): es-ES y no local', () =>
    assert.deepEqual(elegirIdioma([], []), { lang: 'es-ES', enDispositivo: false }));
  ok('los errores del reconocedor se traducen', () => {
    assert.equal(clasificarError('aborted'), null);
    assert.equal(clasificarError('no-speech'), 'sin_voz');
    assert.equal(clasificarError('not-allowed'), 'permiso');
    assert.equal(clasificarError('network'), 'red');
    assert.equal(clasificarError('service-not-allowed'), 'sin_servicio');
    assert.equal(clasificarError('lo-que-sea'), 'desconocido');
  });
  ok('todo error tiene mensaje para el usuario', () => {
    for (const tipo of ['web', 'expo_go', 'sin_modulo', 'sin_servicio', 'permiso', 'sin_voz',
      'red', 'audio', 'idioma', 'ocupado', 'desconocido']) {
      assert.ok(MENSAJES_DICTADO[tipo] && MENSAJES_DICTADO[tipo].length > 20, tipo);
    }
  });
  ok('los estados de descarga del idioma tienen mensaje propio', () => {
    const mensajes = ['opened_dialog', 'download_success', 'download_scheduled', 'error'].map(mensajeDescarga);
    assert.equal(new Set(mensajes).size, 4);
  });

  console.log('--- Respuesta y etapas ---');
  ok('etapas reales del pipeline simple', () => {
    assert.equal(pasoDeEtapa('Preparando consulta...'), 0);
    assert.equal(pasoDeEtapa('Buscando normativa...'), 0);
    assert.equal(pasoDeEtapa('Analizando fuentes...'), 1);
    assert.equal(pasoDeEtapa('Generando respuesta...'), 2);
    assert.equal(pasoDeEtapa('Validando fuentes...'), 3);
  });
  ok('las etapas de documentos no muestran el indicador de pasos', () => {
    assert.equal(pasoDeEtapa('Leyendo el documento...'), -1);
    assert.equal(pasoDeEtapa(null), -1);
  });
  ok('analizarTexto separa títulos, párrafos y viñetas', () => {
    const tipos = analizarTexto('**Análisis**\n\nUn párrafo.\n\n- uno\n- dos').map((b) => b.tipo);
    assert.deepEqual(tipos, ['titulo', 'parrafo', 'vineta', 'vineta']);
  });

  console.log('--- Estados del avatar ---');
  const base = { dictado: 'inactivo', hablando: false, procesando: false, conError: false };
  const est = (cambio) => resolverEstadoAvatar({ ...base, ...cambio });
  ok('en reposo: idle', () => assert.equal(est({}), 'idle'));
  ok('dictado: escuchando → listening; permiso/transcribiendo/instalando → transcribing', () => {
    assert.equal(est({ dictado: 'escuchando' }), 'listening');
    for (const d of ['permiso', 'transcribiendo', 'instalando']) assert.equal(est({ dictado: d }), 'transcribing');
  });
  ok('consulta en curso → thinking; lectura en voz alta → speaking', () => {
    assert.equal(est({ procesando: true }), 'thinking');
    assert.equal(est({ hablando: true }), 'speaking');
  });
  ok('error de consulta o de servidor → error, pero no tapa una acción en curso', () => {
    assert.equal(est({ conError: true }), 'error');
    assert.equal(est({ conError: true, procesando: true }), 'thinking');
    assert.equal(est({ conError: true, hablando: true }), 'speaking');
  });
  ok('lo que el usuario hace (hablar) manda sobre lo que la app hace', () => {
    assert.equal(est({ dictado: 'escuchando', hablando: true, procesando: true }), 'listening');
    assert.equal(est({ hablando: true, procesando: true }), 'speaking');
  });
  ok('un fallo del dictado es error; un aviso informativo NO', () => {
    assert.equal(est({ dictado: 'error' }), 'error');
    assert.equal(est({ dictado: 'error', dictadoInformativo: true }), 'idle');
    assert.equal(estadoAvatarDelPanel('error', true), 'idle');
    assert.equal(estadoAvatarDelPanel('escuchando', false), 'listening');
  });
  ok('todo estado tiene etiqueta accesible y texto definido, sin porcentajes', () => {
    for (const e of ['idle', 'listening', 'transcribing', 'thinking', 'speaking', 'error']) {
      assert.match(ETIQUETA_AVATAR[e], /^Asistente jurídico, /);
      assert.ok(e in TEXTO_ESTADO);
    }
    assert.equal(TEXTO_ESTADO.listening, 'Te escucho…');
    assert.equal(TEXTO_ESTADO.thinking, 'Analizando tu consulta…');
    assert.ok(!/%|[0-9]/.test(TEXTO_ESTADO.thinking));
  });

  console.log('--- Cache y persistencia ---');
  const { claves } = cargar('./services/persistencia/claves');
  ok('las claves de query son estables y separan por dominio', () => {
    assert.deepEqual(claves.historial(), ['consultas', 'historial']);
    assert.deepEqual(claves.consulta('abc'), ['consultas', 'detalle', 'abc']);
    assert.deepEqual(claves.articulo('CC', 42), ['normativa', 'articulo', 'CC', 42]);
    assert.deepEqual(claves.indice('CPC'), ['normativa', 'indice', 'CPC']);
  });

  // El buster es lo unico que protege de rehidratar objetos con una forma vieja tras un
  // cambio de tipos. Se ejercita el comportamiento, no la existencia de la constante.
  const { persistQueryClientRestore } = await import('@tanstack/react-query-persist-client');
  const { QueryClient } = await import('@tanstack/react-query');
  const restaurarCon = async (buster) => {
    let descartada = false;
    await persistQueryClientRestore({
      queryClient: new QueryClient(),
      persister: {
        restoreClient: async () => ({
          buster: 'v1', timestamp: Date.now(),
          clientState: { mutations: [], queries: [] },
        }),
        removeClient: async () => { descartada = true; },
        persistClient: async () => {},
      },
      buster,
    });
    return descartada;
  };
  const conBusterDistinto = await restaurarCon('v2');
  ok('una cache guardada con otra version se descarta', () => assert.equal(conBusterDistinto, true));
  const conMismoBuster = await restaurarCon('v1');
  ok('una cache de la version actual se conserva', () => assert.equal(conMismoBuster, false));

  console.log('--- Sincronizacion ---');
  const { proximoIntento } = cargar('./services/sync/backoff');
  ok('backoff progresa y respeta el techo', () => {
    const b0 = proximoIntento(0, 1000, 0.5);
    const b1 = proximoIntento(1, 1000, 0.5);
    const b10 = proximoIntento(10, 1000, 0.5);
    assert.ok(b1 > b0, 'Debe aumentar con los intentos');
    assert.equal(b10, 1000 + 1_800_000, 'Debe respetar el techo de 30 minutos sin jitter si rnd es 0.5');
  });

  const { clasificar } = cargar('./services/sync/clasificarError');
  ok('clasificarError asigna el desenlace correcto', () => {
    assert.equal(clasificar({ codigo: 'SIN_CONEXION' }).desenlace, 'reintentar');
    assert.equal(clasificar({ estado: 500 }).desenlace, 'reintentar');
    assert.equal(clasificar({ estado: 429 }).desenlace, 'reintentar');
    assert.equal(clasificar({ estado: 200 }).desenlace, 'exito');
    assert.equal(clasificar({ estado: 409 }).desenlace, 'exito');
    assert.equal(clasificar({ estado: 400 }).desenlace, 'descartar');
    assert.equal(clasificar({ estado: 422 }).desenlace, 'descartar');
    assert.equal(clasificar({ estado: 401 }).desenlace, 'pausar');
    assert.equal(clasificar({ estado: 404 }).desenlace, 'descartar');
  });

  const { EsquemaConsultaIniciar } = cargar('./models/consultas/esquemas');
  ok('EsquemaConsultaIniciar valida payload, texto corto, largo y nulls', () => {
    assert.ok(EsquemaConsultaIniciar.safeParse({ texto: 'Hola mundo', documento_id: null, client_op_id: '123e4567-e89b-12d3-a456-426614174000' }).success);
    assert.ok(!EsquemaConsultaIniciar.safeParse({ texto: 'Ho', documento_id: null, client_op_id: '123e4567-e89b-12d3-a456-426614174000' }).success);
    assert.ok(!EsquemaConsultaIniciar.safeParse({ texto: 'H'.repeat(2001), documento_id: null, client_op_id: '123e4567-e89b-12d3-a456-426614174000' }).success);
  });

  console.log('--- Corpus Offline ---');
  const { armarDetalleLocal, vecinosPuros } = cargar('./models/normativa/corpus');
  ok('vecinos en el medio', () => {
    assert.deepEqual(vecinosPuros(5, [1, 5, 10]), { anterior: 1, siguiente: 10 });
  });
  ok('vecinos en los bordes', () => {
    assert.deepEqual(vecinosPuros(1, [1, 5, 10]), { anterior: null, siguiente: 5 });
    assert.deepEqual(vecinosPuros(10, [1, 5, 10]), { anterior: 5, siguiente: null });
  });
  ok('vecinos si no existe', () => {
    assert.deepEqual(vecinosPuros(2, [1, 5, 10]), { anterior: null, siguiente: null });
  });
  ok('armarDetalleLocal conserva los campos', () => {
    const art = {
      id: 'abc', codigo: 'CC', articulo: 'Art. 1', numero_articulo: 1, epigrafe: 'Comienzo',
      texto: 'Contenido', area_juridica: null,
      ubicacion: { libro: null, parte: null, titulo: null, capitulo: null, seccion: null },
      estado_vigencia: 'vigente', nota_vigencia: null, fuente_nombre: 'Ley 1', fuente_url: 'http',
      version: 1
    };
    const det = armarDetalleLocal(art, null, 2);
    assert.equal(det.anterior, null);
    assert.equal(det.siguiente, 2);
    assert.equal(det.estado_vigencia, 'vigente');
    assert.equal(det.fuente_url, 'http');
  });

  console.log('--- Llamada: intención de lo que se dice ---');
  const vacio = { documentoActivo: false, analisis: false, comparacion: false, generado: false, reporte: false, flujo: null };
  const dice = (texto, ctx = {}) => detectarIntencionLlamada(texto, { ...vacio, ...ctx });
  const tipo = (texto, ctx) => dice(texto, ctx).tipo;
  ok('aPlano quita acentos, signos y mayúsculas', () =>
    assert.equal(aPlano('¿Compará ESTE contrato, por favor?'), 'compara este contrato por favor'));
  ok('las preguntas jurídicas siguen siendo consultas (incluso con documento y resultados activos)', () => {
    const todo = { documentoActivo: true, analisis: true, comparacion: true, generado: true, reporte: true };
    for (const frase of [
      '¿Qué dice el artículo 340 del Código Civil?',
      '¿Cuál es el monto?', '¿Cuál es la cláusula más riesgosa?', '¿Qué obligaciones tiene el prestatario?',
      '¿Qué pasa si no paga?', 'Puede un menor hacer un contrato de alquiler', 'Se puede hacer un contrato verbal',
      '¿Es válido un contrato sin firma?', 'Explícame el análisis del contrato', 'Cuánto dura la prescripción',
      'Analiza la cláusula quinta del contrato', 'Muéstrame cómo funciona la prescripción',
      'Qué diferencia hay entre arrendamiento y comodato',
    ]) assert.equal(tipo(frase, todo), 'consulta', frase);
  });
  ok('subir / revisar un contrato abre el selector', () => {
    for (const frase of ['Quiero revisar un contrato', 'Quiero subir un documento', 'Analiza este PDF',
      'Necesito subir un archivo', 'Subir otro documento', 'Cambiar de documento', 'Quiero subir otro'])
      assert.equal(tipo(frase), 'subir_documento', frase);
    assert.equal(tipo('Quiero revisar un contrato', { documentoActivo: true }), 'subir_documento');
    assert.equal(tipo('Cambiá de documento', { documentoActivo: true }), 'subir_documento');
  });
  ok('«analizá el contrato» habla del activo solo si lo hay', () => {
    assert.equal(tipo('Analizá el contrato', { documentoActivo: true }), 'analizar_documento');
    assert.equal(tipo('Revisá este documento', { documentoActivo: true }), 'analizar_documento');
    assert.equal(tipo('Analizá el contrato'), 'subir_documento');
  });
  ok('cerrar el documento activo (y no confundirlo con cerrar el panel)', () => {
    assert.equal(tipo('Cerrá el documento'), 'cerrar_documento');
    assert.equal(tipo('Quitá este contrato'), 'cerrar_documento');
    assert.deepEqual(dice('Cerrá el panel'), { tipo: 'panel', accion: 'cerrar' });
    assert.deepEqual(dice('Minimizá el panel'), { tipo: 'panel', accion: 'minimizar' });
    assert.deepEqual(dice('Expandí el panel'), { tipo: 'panel', accion: 'expandir' });
  });
  ok('comparar documentos', () => {
    for (const frase of ['Compará este contrato con otro', 'Compará estos dos documentos', 'Quiero comparar dos contratos',
      'Comparalo con otro contrato', '¿Qué diferencias existen entre ambos?'])
      assert.equal(tipo(frase, { documentoActivo: true }), 'comparar', frase);
  });
  ok('generar un documento', () => {
    for (const frase of ['Generame un contrato de préstamo', 'Preparame una carta', 'Redactá un contrato de alquiler',
      'Generame un documento con estas condiciones', 'Generame un documento basado en este análisis',
      'Quiero que me generes un contrato de compraventa', 'Elaborá un borrador de préstamo'])
      assert.equal(tipo(frase, { analisis: true }), 'generar_documento', frase);
  });
  ok('reportes: uno nuevo, o el ajuste del que está a la vista', () => {
    for (const frase of ['Generame un reporte', 'Preparame un reporte de este contrato', 'Generame un reporte de riesgos',
      'Generame un informe de la comparación', 'Mostrame un reporte de mis documentos por tipo'])
      assert.deepEqual(dice(frase, { reporte: true }), { tipo: 'reporte', ajuste: false }, frase);
    assert.deepEqual(dice('Mostralo como gráfico de barras', { reporte: true }), { tipo: 'reporte', ajuste: true });
    assert.deepEqual(dice('Ordenalos de mayor a menor', { reporte: true }), { tipo: 'reporte', ajuste: true });
    assert.equal(tipo('Mostralo como gráfico de barras'), 'consulta'); // sin reporte no hay qué ajustar
  });
  ok('modificar el documento generado solo si hay uno', () => {
    assert.equal(tipo('Cambiá el plazo a 18 meses', { generado: true }), 'modificar_generado');
    assert.equal(tipo('Agregá una cláusula de garantía', { generado: true }), 'modificar_generado');
    assert.equal(tipo('Cambiá el plazo a 18 meses'), 'consulta');
    // Con un reporte a la vista, un pedido de gráfico es del reporte, no del documento.
    assert.deepEqual(dice('Agregá una columna de riesgos por severidad', { generado: true, reporte: true }),
      { tipo: 'reporte', ajuste: true });
  });
  ok('mostrar lo que ya existe', () => {
    assert.deepEqual(dice('Mostrame el análisis'), { tipo: 'mostrar', que: 'documento' });
    assert.deepEqual(dice('Ver las fuentes'), { tipo: 'mostrar', que: 'respuesta' });
    assert.deepEqual(dice('Quiero ver la respuesta'), { tipo: 'mostrar', que: 'respuesta' });
    assert.deepEqual(dice('Mostrame las diferencias'), { tipo: 'mostrar', que: 'comparacion' });
    assert.deepEqual(dice('Mostrame el reporte'), { tipo: 'mostrar', que: 'reporte' });
    assert.deepEqual(dice('Abrí el borrador'), { tipo: 'mostrar', que: 'generado' });
    assert.deepEqual(dice('Mostrame los riesgos'), { tipo: 'mostrar', que: 'documento' });
  });
  ok('durante la generación por voz, lo que se dice responde a la pregunta salvo control', () => {
    const g = { flujo: 'generacion' };
    assert.deepEqual(dice('Veinte mil bolivianos', g), { tipo: 'flujo', accion: 'responder' });
    assert.deepEqual(dice('20.000 bolivianos', g), { tipo: 'flujo', accion: 'responder' });
    assert.deepEqual(dice('Juan Pérez Molina', g), { tipo: 'flujo', accion: 'responder' });
    assert.deepEqual(dice('No sé', g), { tipo: 'flujo', accion: 'omitir' });
    assert.deepEqual(dice('Generalo así', g), { tipo: 'flujo', accion: 'generar_ya' });
    assert.deepEqual(dice('Cancelar', g), { tipo: 'flujo', accion: 'cancelar' });
    assert.deepEqual(dice('Olvidalo', g), { tipo: 'flujo', accion: 'cancelar' });
    assert.deepEqual(dice('Préstamo', g), { tipo: 'flujo', accion: 'responder' });
  });
  ok('la comparación en espera solo entiende «cancelar»; lo demás sigue funcionando', () => {
    const c = { flujo: 'comparacion' };
    assert.deepEqual(dice('Cancelar', c), { tipo: 'flujo', accion: 'cancelar' });
    assert.equal(tipo('¿Qué dice el artículo 340?', c), 'consulta');
    assert.equal(tipo('Mostrame el análisis', c), 'mostrar');
  });
  ok('texto vacío o sin sentido es una consulta (el flujo de siempre lo resuelve)', () => {
    assert.equal(tipo(''), 'consulta');
    assert.equal(tipo('hola buenos días'), 'consulta');
  });

  console.log('--- Llamada: lo que dice el asistente ---');
  const analisisDe = (extra = {}) => ({
    id: 'a1', documento_id: 'd1', tipo_documento: 'prestamo', clausulas: [{}, {}, {}], hallazgos: [],
    parrafo_partes: null, riesgos: [{ severidad: 'alta' }, { severidad: 'media' }], reglas_evaluadas: 9,
    resumen: 'Es un préstamo entre dos personas. Tiene plazo de doce meses. Incluye interés.',
    observaciones: [], fuentes_ia: [], ia_error: null, creado_en: '', ...extra,
  });
  ok('nombreHablado quita extensión y guiones bajos', () => {
    assert.equal(nombreHablado('contrato_prestamo-v2.pdf'), 'contrato prestamo v2');
  });
  ok('primerasOraciones nunca corta a mitad de una oración', () => {
    assert.equal(primerasOraciones('Uno. Dos. Tres.', 8), 'Uno.');
    assert.equal(primerasOraciones('Corto.', 100), 'Corto.');
    assert.equal(primerasOraciones('x'.repeat(500), 100), '');
  });
  ok('el análisis se resume solo con lo que el backend devolvió', () => {
    const t = resumenAnalisis('contrato_prestamo.pdf', analisisDe());
    assert.match(t, /^Ya terminé de analizar contrato prestamo\./);
    assert.match(t, /contrato de préstamo/);
    assert.match(t, /3 cláusulas/);
    assert.match(t, /2 riesgos, 1 de severidad alta/);
    assert.match(t, /Es un préstamo entre dos personas\./);
  });
  ok('un documento no reconocido no inventa cláusulas ni riesgos', () => {
    const t = resumenAnalisis('carta.pdf', analisisDe({ tipo_documento: 'otro', resumen: 'Algo.' }));
    assert.doesNotMatch(t, /cláusulas|riesgo/);
    assert.match(t, /no pude identificar/);
  });
  ok('sin riesgos no se dice que hay riesgos', () => {
    const t = resumenAnalisis('c.pdf', analisisDe({ riesgos: [], resumen: null, clausulas: [] }));
    assert.match(t, /ningún riesgo/);
    assert.doesNotMatch(t, /cláusula/);
  });
  const cmp = (dif) => ({ id: 'c', documento_a_id: 'a', documento_b_id: 'b', nombre_a: 'A.pdf', nombre_b: 'B.pdf',
    estrategia: 'clausulas', cantidad_cambios: dif.length, diferencias: dif, creada_en: '' });
  ok('comparación: cuenta por tipo y cita las explicaciones del backend', () => {
    const t = resumenComparacion(cmp([
      { tipo: 'modificado', explicacion: 'El plazo cambia de 12 a 18 meses.' },
      { tipo: 'agregado', explicacion: 'Se agrega una garantía.' },
      { tipo: 'agregado', explicacion: 'Tercera.' }]));
    assert.match(t, /3 diferencias: 1 modificada, 2 agregadas/);
    assert.match(t, /El plazo cambia de 12 a 18 meses\. Se agrega una garantía\./);
    assert.doesNotMatch(t, /Tercera/);
    assert.match(resumenComparacion(cmp([])), /no encontré diferencias/);
  });
  ok('documento generado: avisa lo pendiente y distingue una revisión', () => {
    const g = { id: 'g', tipo_documento: 'prestamo', contenido: '', version: 2, documento_padre_id: null,
      campos_faltantes: ['garantía'], fuentes: [], ia_error: null, creado_en: '' };
    assert.match(resumenGenerado(g, false), /borrador de préstamo/);
    assert.match(resumenGenerado(g, false), /Quedó 1 dato pendiente.*garantía\. No lo completo/);
    assert.match(resumenGenerado({ ...g, campos_faltantes: ['a', 'b'] }, false), /Quedaron 2 datos pendientes.*a, b\. No los completo/);
    assert.match(resumenGenerado(g, true), /versión 2/);
    assert.doesNotMatch(resumenGenerado({ ...g, campos_faltantes: [] }, false), /pendiente/);
  });
  ok('reporte: no promete una descarga que solo existe en la web', () => {
    const r = { titulo: 'Mis contratos', total: 4, exportacion: 'xlsx' };
    assert.match(resumenReporte(r, false), /solo está disponible en la versión web/);
    assert.doesNotMatch(resumenReporte(r, true), /versión web/);
    assert.match(resumenReporte({ ...r, total: 0, exportacion: '' }, true), /No hay datos/);
  });
  ok('la pregunta por un dato usa la etiqueta del backend; la primera explica cómo seguir', () => {
    const campo = { clave: 'monto', etiqueta: 'Monto prestado y moneda', obligatorio: true };
    assert.match(preguntaDeCampo(campo, true, 8), /Me faltan 8 datos obligatorios.*generalo así.*Monto prestado y moneda\./);
    assert.equal(preguntaDeCampo(campo, false, 7), 'Siguiente dato: Monto prestado y moneda.');
  });

  console.log('--- Escáner: cámara, OCR y voz ---');
  ok('ÓRDENES de escaneo abren la cámara: documento o cláusula', () => {
    for (const frase of ['Quiero escanear un contrato', 'Escanear documento', 'Escaneá este documento',
      'Quiero usar la cámara', 'Abrí la cámara', 'Sacá una foto del contrato', 'Quiero analizar este documento en papel',
      'Necesito digitalizar un contrato'])
      assert.deepEqual(dice(frase), { tipo: 'escanear', modo: 'documento' }, frase);
    for (const frase of ['Quiero fotografiar una cláusula', 'Escaneá esta cláusula', 'Quiero preguntarte sobre esta cláusula',
      'Quiero preguntarte sobre una cláusula', 'Sacá una foto de esta cláusula'])
      assert.deepEqual(dice(frase), { tipo: 'escanear', modo: 'clausula' }, frase);
  });
  ok('las preguntas jurídicas NO abren la cámara (ni con documento activo)', () => {
    const activo = { documentoActivo: true, analisis: true };
    for (const frase of ['¿Cómo escaneo un contrato para que tenga validez?', '¿Es válido un contrato escaneado?',
      'Un contrato escaneado tiene valor legal', 'Puedo escanear un contrato y firmarlo', '¿Qué dice esta cláusula?',
      '¿Es abusiva esta cláusula?', 'Explícame la cláusula quinta', 'Cuál es la foto del contrato',
      'Quiero preguntarte sobre esta cláusula del contrato de alquiler', 'Quiero preguntarte sobre la cláusula de rescisión'])
      assert.equal(tipo(frase, activo), 'consulta', frase);
  });
  ok('lo ambiguo cae en consulta o en el flujo de siempre, no en la cámara', () => {
    assert.equal(tipo('Analiza este PDF'), 'subir_documento');
    assert.equal(tipo('Quiero subir un documento'), 'subir_documento');
    assert.equal(tipo('Quiero revisar un contrato'), 'subir_documento');
    assert.equal(tipo('Generame un contrato de préstamo'), 'generar_documento');
    assert.equal(tipo('hola buenos días'), 'consulta');
  });
  ok('con un escaneo ya leído: «analizalo» es de ESE escaneo y «cancelar» lo descarta', () => {
    const e = { flujo: 'escaneo' };
    assert.deepEqual(dice('Analizá el documento', e), { tipo: 'analizar_escaneo' });
    assert.deepEqual(dice('Analizalo', e), { tipo: 'analizar_escaneo' });
    assert.deepEqual(dice('Cancelar', e), { tipo: 'flujo', accion: 'cancelar' });
    assert.equal(tipo('¿Cuál es el plazo?', e), 'consulta');
    assert.deepEqual(dice('Quiero escanear otro contrato', e), { tipo: 'escanear', modo: 'documento' });
  });
  ok('armarTextoOcr: líneas de un bloque juntas, un párrafo por bloque, sin vacíos', () => {
    assert.equal(armarTextoOcr([{ lineas: ['CONTRATO DE PRÉSTAMO', ' '] }, { lineas: ['Cláusula 1ª:', 'El monto es Bs. 20.000,50'] }, { lineas: [] }]),
      'CONTRATO DE PRÉSTAMO\n\nCláusula 1ª:\nEl monto es Bs. 20.000,50');
    assert.equal(armarTextoOcr([]), '');
  });
  const pag = (id, texto) => ({ id, uri: 'file:///' + id, ancho: 1, alto: 1, texto, estado: texto ? 'ok' : 'pendiente' });
  ok('armarTextoEscaneo conserva el orden y marca la página de origen (las vacías se omiten, no se inventan)', () => {
    const t = armarTextoEscaneo([pag('a', 'Uno'), pag('b', null), pag('c', 'Tres')]);
    assert.equal(t, '--- Página 1 ---\nUno\n\n--- Página 3 ---\nTres');
    assert.equal(armarTextoEscaneo([]), '');
  });
  ok('suficiencia: el backend exige 200 caracteres útiles', () => {
    assert.equal(MINIMO_CARACTERES_DOCUMENTO, 200);
    assert.equal(evaluarSuficiencia('').estado, 'vacio');
    assert.equal(evaluarSuficiencia('a '.repeat(50)).estado, 'corto');
    assert.deepEqual(evaluarSuficiencia('a'.repeat(200)), { estado: 'ok', caracteres: 200 });
    assert.equal(contarCaracteresUtiles(' a b\n c '), 3);
    assert.equal(estadoDeTexto('x'), 'vacia');
    assert.equal(estadoDeTexto('Artículo primero del contrato'), 'ok');
  });
  ok('moverPagina: mueve una posición y no se sale de rango', () => {
    const ids = (l) => l.map((p) => p.id).join('');
    const l = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
    assert.equal(ids(moverPagina(l, 'b', -1)), 'bac');
    assert.equal(ids(moverPagina(l, 'b', 1)), 'acb');
    assert.equal(moverPagina(l, 'a', -1), l);
    assert.equal(moverPagina(l, 'c', 1), l);
    assert.equal(moverPagina(l, 'zz', 1), l);
    assert.equal(ids(l), 'abc'); // no muta
  });
  ok('tamanoDestino acota el lado mayor y no toca lo que ya cabe', () => {
    assert.equal(tamanoDestino(1600, 1200), null);
    assert.deepEqual(tamanoDestino(4000, 3000), { width: LADO_MAXIMO_PX });
    assert.deepEqual(tamanoDestino(3000, 4000), { height: LADO_MAXIMO_PX });
  });
  ok('nombres de archivo del escaneo: ASCII, con fecha y páginas', () => {
    const f = new Date(2026, 8, 21, 14, 5);
    assert.equal(nombreArchivoEscaneo(f, 3), 'Escaneo 21-09-2026 14-05 (3 paginas).txt');
    assert.equal(nombreArchivoEscaneo(f, 1), 'Escaneo 21-09-2026 14-05 (1 pagina).txt');
    assert.equal(nombreArchivoClausula(f), 'Clausula escaneada 21-09-2026 14-05.txt');
    assert.ok(/^[\x20-\x7e]+$/.test(nombreArchivoEscaneo(f, 2)));
  });
  ok('la consulta con cláusula cabe en los 2000 caracteres del backend y avisa si recortó', () => {
    const corta = componerConsultaConClausula('  El plazo es de\n12 meses. ', '¿Es abusivo?');
    assert.equal(corta, 'Cláusula fotografiada: «El plazo es de 12 meses.» Pregunta sobre esa cláusula: ¿Es abusivo?');
    const larga = componerConsultaConClausula('palabra '.repeat(1000), 'p'.repeat(900));
    assert.ok(larga.length <= 2000, String(larga.length));
    assert.match(larga, /\(texto recortado\)/);
    assert.doesNotMatch(corta, /recortado/);
  });
  ok('resúmenes del escaneo: cuentan lo real y sugieren repetir lo que falló', () => {
    assert.match(resumenEscaneo(3, 0, 0), /Terminé de leer 3 páginas.*analice el documento/);
    assert.match(resumenEscaneo(4, 1, 0), /1 página no tiene texto legible.*repite/);
    assert.match(resumenEscaneo(2, 0, 2), /No pude leer 2 páginas/);
    const t = resumenAnalisis('Escaneo 21-09-2026.txt', analisisDe(), 4);
    assert.match(t, /^Terminé de analizar el documento escaneado, de 4 páginas\./);
    assert.doesNotMatch(t, /Escaneo 21/);
    assert.match(resumenAnalisis('a.pdf', analisisDe()), /^Ya terminé de analizar a\./);
  });

  console.log('--- Archivos móviles: guardar, compartir y recibir ---');
  const MB = 1024 * 1024;
  const DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  const recibido = (extra) => ({ contentUri: 'file:///cache/contrato.pdf', contentMimeType: 'application/pdf',
    originalName: 'contrato.pdf', contentSize: 840 * 1024, ...extra });
  ok('MIME: el tipo REAL de cada formato, nunca un comodín', () => {
    assert.equal(mimeDeFormato('pdf'), 'application/pdf');
    assert.equal(mimeDeFormato('docx'), DOCX);
    assert.equal(mimeDeFormato('xlsx'), 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    assert.equal(mimeDeFormato('pptx'), 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
    assert.equal(mimeDeArchivo('a.PDF', '*/*'), 'application/pdf'); // manda la extensión conocida
    assert.equal(mimeDeArchivo('a.xyz', 'image/png'), 'image/png');
    assert.equal(mimeDeArchivo('a', null), 'application/octet-stream');
    for (const mime of Object.values(MIME_POR_EXTENSION)) assert.notEqual(mime, '*/*');
  });
  ok('extensiones y nombres de salida con la extensión correcta', () => {
    assert.equal(extensionDeNombre('Contrato.Final.PDF'), '.pdf');
    assert.equal(extensionDeNombre('.gitignore'), '');
    assert.equal(extensionDeNombre('sin_extension'), '');
    assert.equal(conExtension('borrador_prestamo_v1', 'pdf'), 'borrador_prestamo_v1.pdf');
    assert.equal(conExtension('borrador.docx', 'pdf'), 'borrador.pdf');
    assert.equal(conExtension('reporte.xlsx', 'xlsx'), 'reporte.xlsx');
  });
  ok('guardar nunca sobrescribe: nombreUnico agrega (1), (2)…', () => {
    assert.equal(nombreUnico('a.pdf', []), 'a.pdf');
    assert.equal(nombreUnico('a.pdf', ['A.PDF']), 'a (1).pdf');
    assert.equal(nombreUnico('a.pdf', ['a.pdf', 'a (1).pdf']), 'a (2).pdf');
    assert.equal(nombreUnico('sin', ['sin']), 'sin (1)');
  });
  ok('recibir: PDF, DOCX y TXT son los formatos que procesa el backend', () => {
    for (const [nombre, mime, ext] of [['c.pdf', 'application/pdf', '.pdf'], ['c.docx', DOCX, '.docx'], ['c.txt', 'text/plain', '.txt']]) {
      const r = normalizarRecibido(recibido({ originalName: nombre, contentMimeType: mime }));
      assert.equal(r.ok, true, nombre);
      assert.equal(r.archivo.extension, ext);
      assert.equal(r.archivo.mime, MIME_POR_EXTENSION[ext]);
    }
    assert.equal(describirArchivo({ extension: '.pdf', tamano: 840 * 1024 }), 'PDF · 840 KB');
    assert.equal(describirArchivo({ extension: '.docx', tamano: null }), 'DOCX');
  });
  ok('recibir: lo que el backend no procesa se rechaza con «formato no compatible»', () => {
    for (const [nombre, mime] of [['datos.zip', 'application/zip'], ['app.apk', 'application/vnd.android.package-archive'],
      ['video.mp4', 'video/mp4'], ['foto.jpg', 'image/jpeg'], ['libro.xlsx', MIME_POR_EXTENSION['.xlsx']], ['viejo.doc', 'application/msword']]) {
      const r = normalizarRecibido(recibido({ originalName: nombre, contentMimeType: mime }));
      assert.equal(r.ok, false, nombre);
      assert.equal(r.motivo, 'formato');
      assert.equal(r.mensaje, MENSAJES_RECEPCION.formato);
    }
    // Extensión de PDF pero el contenido declarado es otro: no se cree solo en el nombre.
    assert.equal(normalizarRecibido(recibido({ contentMimeType: 'application/zip' })).ok, false);
  });
  ok('recibir: MIME ausente o genérico → manda la extensión; sin extensión → manda el MIME', () => {
    assert.equal(normalizarRecibido(recibido({ contentMimeType: null })).ok, true);
    assert.equal(normalizarRecibido(recibido({ contentMimeType: 'application/octet-stream' })).ok, true);
    const sinExt = normalizarRecibido(recibido({ originalName: 'contrato', contentMimeType: 'application/pdf' }));
    assert.equal(sinExt.ok, true);
    assert.equal(sinExt.archivo.nombre, 'contrato.pdf');
    assert.equal(normalizarRecibido(recibido({ originalName: 'contrato', contentMimeType: null })).ok, false);
  });
  ok('recibir: tamaño (10 MB como el backend), vacío y sin URI', () => {
    assert.equal(normalizarRecibido(recibido({ contentSize: 10 * MB })).ok, true);
    const grande = normalizarRecibido(recibido({ contentSize: 10 * MB + 1 }));
    assert.equal(grande.motivo, 'tamano');
    assert.match(grande.mensaje, /supera el tamaño permitido/);
    assert.equal(normalizarRecibido(recibido({ contentSize: 0 })).motivo, 'vacio');
    assert.equal(normalizarRecibido(recibido({ contentSize: null })).ok, true); // se comprueba la copia después
    assert.equal(normalizarRecibido(recibido({ contentUri: null })).motivo, 'sin_uri');
  });
  ok('recibir: el nombre es solo un nombre (nunca una ruta del otro app)', () => {
    assert.equal(normalizarRecibido(recibido({ originalName: '../../etc/pass.pdf' })).archivo.nombre, 'pass.pdf');
    assert.equal(normalizarRecibido(recibido({ originalName: 'C:\\x\\y\\z.docx', contentMimeType: DOCX })).archivo.nombre, 'z.docx');
    assert.equal(normalizarRecibido(recibido({ originalName: null, contentUri: 'file:///cache/Mi%20Contrato.pdf' })).archivo.nombre, 'Mi Contrato.pdf');
  });
  ok('deduplicación: el mismo share dentro de la ventana se ignora; fuera de ella es un pedido nuevo', () => {
    const vistos = new Map();
    const clave = claveDeRecepcion(recibido());
    assert.equal(esShareRepetido(vistos, clave, 1000), false);
    assert.equal(esShareRepetido(vistos, clave, 2500), true);  // re-render o listener repetido
    assert.equal(esShareRepetido(vistos, claveDeRecepcion(recibido({ originalName: 'otro.pdf' })), 2600), false);
    assert.equal(esShareRepetido(vistos, clave, 2500 + 4001), false); // el usuario lo compartió otra vez
    assert.notEqual(claveDeRecepcion(recibido()), claveDeRecepcion(recibido({ contentSize: 1 })));
  });
  ok('pantalla del sistema: se libera al volver del share sheet aunque la app salga DESPUÉS del resultado', () => {
    const cuando = [];
    // Share sheet: la promesa termina con la app aún activa; un instante después se abre WhatsApp y sale.
    let l = crearLiberador('active', () => cuando.push('a'));
    l.cambio('background');            // sale a WhatsApp
    assert.deepEqual(cuando, []);      // todavía no
    l.vencio();                        // la ventana venció pero YA salió: no se libera
    assert.deepEqual(cuando, []);
    l.cambio('active');                // vuelve a la llamada
    assert.deepEqual(cuando, ['a']);
    l.cambio('background'); l.cambio('active'); // no se libera dos veces
    assert.deepEqual(cuando, ['a']);
    // Usuario cierra el share sheet sin elegir: la app nunca salió → se libera al vencer la ventana.
    const b = []; l = crearLiberador('active', () => b.push('b')); l.vencio();
    assert.deepEqual(b, ['b']);
    // Ya estaba fuera cuando terminó la promesa: se libera al volver.
    const c = []; l = crearLiberador('background', () => c.push('c'));
    l.vencio(); assert.deepEqual(c, []); l.cambio('active'); assert.deepEqual(c, ['c']);
    // Tope de seguridad.
    const d = []; l = crearLiberador('background', () => d.push('d')); l.forzar(); l.forzar();
    assert.deepEqual(d, ['d']);
  });
  ok('órdenes de voz: guardar y compartir SOLO si hay algo generado; no rompen las preguntas jurídicas', () => {
    const g = { generado: true };
    const r = { reporte: true };
    assert.deepEqual(dice('Compartí este documento', g), { tipo: 'salida', accion: 'compartir', objeto: 'generado' });
    assert.deepEqual(dice('Guardá este documento', g), { tipo: 'salida', accion: 'guardar', objeto: 'generado' });
    assert.deepEqual(dice('Guardá el reporte', r), { tipo: 'salida', accion: 'guardar', objeto: 'reporte' });
    assert.deepEqual(dice('Compartí el reporte', r), { tipo: 'salida', accion: 'compartir', objeto: 'reporte' });
    assert.deepEqual(dice('Compartilo', g), { tipo: 'salida', accion: 'compartir', objeto: 'auto' });
    assert.deepEqual(dice('Quiero guardar el contrato', g), { tipo: 'salida', accion: 'guardar', objeto: 'generado' });
    // Sin nada generado, «guardalo» sigue siendo lo de siempre (el backend guarda el documento activo).
    assert.equal(tipo('Guardalo', { documentoActivo: true }), 'consulta');
    assert.equal(tipo('Guardá este documento'), 'consulta');
    // Pedir el reporte cuando solo hay un documento (o al revés) no inventa nada.
    assert.equal(tipo('Guardá el reporte', g), 'consulta');
    for (const frase of ['¿Puedo compartir un contrato con un tercero?', '¿Qué pasa si no guardo el contrato?',
      'Es legal compartir un documento firmado', '¿Cómo guardo el contrato de alquiler?', 'Guardar silencio ante un contrato'])
      assert.equal(tipo(frase, { generado: true, reporte: true, documentoActivo: true }), 'consulta', frase);
  });
  ok('archivo recibido pendiente: «analizalo» y «sí» analizan ESE archivo; «cancelar» lo descarta; lo demás es consulta', () => {
    const rec = { recibido: true };
    assert.deepEqual(dice('Analizalo', rec), { tipo: 'analizar_recibido' });
    assert.deepEqual(dice('Analizá el documento', rec), { tipo: 'analizar_recibido' });
    assert.deepEqual(dice('Sí', rec), { tipo: 'analizar_recibido' });
    assert.deepEqual(dice('Dale', rec), { tipo: 'analizar_recibido' });
    assert.deepEqual(dice('Cancelar', rec), { tipo: 'flujo', accion: 'cancelar' });
    assert.deepEqual(dice('Descartalo', rec), { tipo: 'flujo', accion: 'cancelar' });
    assert.equal(tipo('¿Cómo cancelo un contrato de alquiler?', rec), 'consulta');
    assert.equal(tipo('Analizá la cláusula quinta del contrato', rec), 'consulta');
    assert.equal(tipo('¿Cuál es el plazo?', rec), 'consulta');
    assert.equal(tipo('Sí', {}), 'consulta'); // sin nada pendiente no hay a qué responder
    // Con un escaneo pendiente sigue funcionando como antes.
    assert.deepEqual(dice('Analizalo', { flujo: 'escaneo' }), { tipo: 'analizar_escaneo' });
    assert.equal(tipo('¿Cómo cancelo un contrato?', { flujo: 'escaneo' }), 'consulta');
  });
  ok('app.json: la app solo se ofrece como destino de PDF y DOCX (lo que el backend procesa)', () => {
    const plugin = appJson.expo.plugins.find((p) => Array.isArray(p) && p[0] === 'expo-sharing');
    assert.ok(plugin, 'falta el plugin expo-sharing');
    const { android, ios } = plugin[1];
    assert.equal(android.enabled, true);
    assert.equal(ios.enabled, false);
    const esperado = ['application/pdf', DOCX].sort();
    assert.deepEqual([...android.singleShareMimeTypes].sort(), esperado);
    assert.deepEqual([...android.multipleShareMimeTypes].sort(), esperado);
    for (const mime of [...android.singleShareMimeTypes, ...android.multipleShareMimeTypes]) {
      assert.ok(!/^(image|video|text|audio)\//.test(mime) && mime !== '*/*', mime); // ni imágenes ni comodines
      assert.ok(Object.values(MIME_POR_EXTENSION).includes(mime), mime);
    }
    assert.ok(!(appJson.expo.android.permissions ?? []).some((p) => /MANAGE_EXTERNAL_STORAGE/.test(p)));
  });

  console.log('--- Recordatorios: fechas, interpretación y modelo ---');
  // «Hoy» de las pruebas: lunes 21 de septiembre de 2026, 10:00 (hora local, sea cual sea la zona de quien corre).
  const AHORA = new Date(2026, 8, 21, 10, 0);
  const HOY = { anio: 2026, mes: 9, dia: 21 };
  const f = (anio, mes, dia) => ({ anio, mes, dia });
  const resolver = (frase, opciones) => resolverInterpretacion(interpretarRecordatorio(frase, AHORA), AHORA, opciones);
  ok('fechas: nombres en español, día de la semana real y claves de almacenamiento', () => {
    assert.equal(F.fechaLarga(f(2026, 9, 25)), 'Viernes 25 de septiembre de 2026');
    assert.equal(F.fechaSinDia(f(2026, 10, 8)), '8 de octubre de 2026');
    assert.equal(F.fechaCorta(f(2026, 10, 8)), '08/10/2026');
    assert.equal(F.fechaBreve(f(2026, 10, 8)), '08 OCT');
    assert.equal(F.horaTexto({ hora: 9, minuto: 0 }), '9:00');
    assert.equal(F.aClave(f(2026, 10, 8), { hora: 9, minuto: 5 }), '2026-10-08T09:05');
    assert.deepEqual(F.deClave('2026-10-08T09:05'), { fecha: f(2026, 10, 8), hora: { hora: 9, minuto: 5 } });
    assert.equal(F.deClave('2026-13-08T09:05'), null);
    assert.equal(F.deClave('mañana'), null);
    assert.equal(F.esFechaValida(f(2026, 2, 29)), false);
    assert.equal(F.esFechaValida(f(2028, 2, 29)), true);
  });
  ok('fechas: sumar días y meses (fin de mes) y contar días de calendario', () => {
    assert.deepEqual(F.sumarDias(f(2026, 10, 15), -7), f(2026, 10, 8));
    assert.deepEqual(F.sumarDias(f(2026, 12, 30), 3), f(2027, 1, 2));
    assert.deepEqual(F.sumarMeses(f(2026, 1, 31), 1), f(2026, 2, 28));
    assert.deepEqual(F.sumarMeses(f(2028, 1, 31), 1), f(2028, 2, 29));
    assert.deepEqual(F.sumarMeses(f(2026, 3, 15), -3), f(2025, 12, 15));
    assert.equal(F.diasEntre(f(2026, 10, 8), f(2026, 10, 15)), 7);
    assert.deepEqual(F.proximoDiaSemana(HOY, 5), f(2026, 9, 25)); // viernes
    assert.deepEqual(F.proximoDiaSemana(HOY, 1), f(2026, 9, 28)); // hoy es lunes: el próximo lunes, no hoy
  });
  ok('validar futuro: una fecha pasada, o de hace segundos, no se programa', () => {
    assert.equal(F.esFutura(HOY, { hora: 9, minuto: 59 }, AHORA), false);
    assert.equal(F.esFutura(HOY, { hora: 10, minuto: 0 }, AHORA), false); // justo ahora ya no es futuro
    assert.equal(F.esFutura(HOY, { hora: 10, minuto: 1 }, AHORA), true);
    assert.equal(F.esFutura(HOY, { hora: 10, minuto: 1 }, AHORA, 2 * 60 * 1000), false); // con colchón para agendar
    assert.equal(F.esFutura(f(2026, 9, 22), { hora: 0, minuto: 0 }, AHORA), true);
  });
  ok('zona horaria: se toma la del dispositivo y solo se habla de «cambio» si ambas se conocen', () => {
    assert.equal(typeof F.zonaHoraria(), 'string');
    assert.equal(F.cambioDeZona('America/La_Paz', 'America/Lima'), true);
    assert.equal(F.cambioDeZona('America/La_Paz', 'America/La_Paz'), false);
    assert.equal(F.cambioDeZona('', 'America/Lima'), false);
    assert.equal(F.cambioDeZona('America/La_Paz', ''), false);
  });
  ok('números en palabras', () => {
    assert.equal(numeroDe('quince'), 15); assert.equal(numeroDe('veinticinco'), 25); assert.equal(numeroDe('treinta y uno'), 31);
    assert.equal(numeroDe('una'), 1); assert.equal(numeroDe('7'), 7); assert.equal(numeroDe('recordame'), null);
  });
  ok('«recordame revisar este contrato mañana»: fecha de mañana, hora por defecto y título del pedido', () => {
    const i = interpretarRecordatorio('Recordame revisar este contrato mañana', AHORA);
    assert.deepEqual(i.fecha, f(2026, 9, 22));
    assert.equal(i.titulo, 'Revisar este contrato');
    assert.equal(i.tipo, 'revision');
    const r = resolverInterpretacion(i, AHORA);
    assert.equal(r.pendiente, null);
    assert.deepEqual(r.hora, { hora: 9, minuto: 0 });
    assert.equal(r.horaOrigen, 'defecto');
  });
  ok('horas: «a las 4» es de la tarde, pero siempre queda marcada para confirmar', () => {
    const r = resolver('avisame mañana a las 4');
    assert.deepEqual(r.hora, { hora: 16, minuto: 0 });
    assert.equal(r.horaOrigen, 'inferida');
    assert.deepEqual(r.fecha, f(2026, 9, 22));
    const dichas = { 'a las 8 de la noche': [20, 0], 'a las 8 de la mañana': [8, 0], 'a las 12 y media': [12, 30],
      'a las 4 y cuarto de la tarde': [16, 15], 'a las 5 menos cuarto': [16, 45], 'a las 16:30': [16, 30],
      'a las 9 am': [9, 0], 'a las 3 pm': [15, 0], 'al mediodía': [12, 0], 'a las 18': [18, 0] };
    for (const [frase, [h, m]] of Object.entries(dichas)) {
      const x = interpretarRecordatorio(`recordame mañana ${frase}`, AHORA);
      assert.deepEqual([x.hora?.hora, x.hora?.minuto], [h, m], frase);
    }
    assert.equal(interpretarRecordatorio('mañana a las 8 de la mañana', AHORA).hora.origen, 'dicha');
  });
  ok('«el viernes» no se adivina en silencio: se propone la fecha y se marca para preguntar', () => {
    const r = resolver('Creá un recordatorio para el viernes a las 4');
    assert.deepEqual(r.fecha, f(2026, 9, 25));
    assert.equal(r.aproximada, 'dia_semana');
    assert.deepEqual(r.hora, { hora: 16, minuto: 0 });
    assert.equal(interpretarRecordatorio('Creá un recordatorio para el viernes a las 4', AHORA).titulo, null);
    assert.match(M.fraseDeConfirmacion(r), /^¿Este viernes 25 de septiembre de 2026 a las 16:00\?$/);
  });
  ok('fechas explícitas: «el 10 de octubre», «15/10/2026», «quince de octubre», año inferido y avisado', () => {
    assert.deepEqual(resolver('creá un recordatorio para el 10 de octubre').fecha, f(2026, 10, 10));
    assert.deepEqual(resolver('recordame el 15/10/2026').fecha, f(2026, 10, 15));
    assert.deepEqual(resolver('recordame el quince de octubre de 2026').fecha, f(2026, 10, 15));
    assert.equal(resolver('recordame el 10 de octubre').aproximada, 'anio');
    assert.equal(resolver('recordame el 10 de octubre de 2026').aproximada, null);
    // Una fecha sin año que ya pasó este año se lleva al año siguiente y se DICE.
    const r = resolver('recordame el 1 de septiembre');
    assert.deepEqual(r.fecha, f(2027, 9, 1));
    assert.equal(r.aproximada, 'anio');
    assert.deepEqual(resolver('recordame el 31/02/2027').fecha, null); // fecha imposible: no se inventa
  });
  ok('relativas simples: hoy, mañana, pasado mañana, en N días/semanas/meses', () => {
    assert.deepEqual(resolver('recordame pasado mañana').fecha, f(2026, 9, 23));
    assert.deepEqual(resolver('recordame en 3 días').fecha, f(2026, 9, 24));
    assert.deepEqual(resolver('recordame en dos semanas').fecha, f(2026, 10, 5));
    assert.deepEqual(resolver('recordame en un mes').fecha, f(2026, 10, 21));
    assert.deepEqual(resolver('recordame hoy a las 20').fecha, HOY);
  });
  ok('N días/semanas antes: se cuenta desde la fecha de referencia; sin referencia, se pregunta', () => {
    const ref = f(2026, 10, 15);
    assert.deepEqual(resolver('Recordame una semana antes', { referencia: ref }).fecha, f(2026, 10, 8));
    assert.deepEqual(resolver('avisame tres días antes', { referencia: ref }).fecha, f(2026, 10, 12));
    assert.deepEqual(resolver('recordame el día antes', { referencia: ref }).fecha, f(2026, 10, 14));
    assert.deepEqual(resolver('recordame un mes antes', { referencia: f(2026, 11, 30) }).fecha, f(2026, 10, 30));
    const dicha = resolver('recordame 3 días antes del 15 de octubre');
    assert.deepEqual(dicha.fecha, f(2026, 10, 12));
    assert.deepEqual(dicha.referencia, ref);
    const sin = resolver('Recordame una semana antes');
    assert.equal(sin.fecha, null);
    assert.equal(sin.pendiente.motivo, 'sin_referencia');
    // Si «una semana antes» cae en el pasado, no se programa.
    assert.equal(resolver('recordame 30 días antes', { referencia: f(2026, 10, 1) }).pendiente.motivo, 'pasada');
    const conf = resolver('Recordame una semana antes', { referencia: ref });
    assert.equal(M.fraseDeConfirmacion(conf), 'La fecha es el 15 de octubre de 2026. ¿Querés que te recuerde el 8 de octubre de 2026 a las 9:00?');
  });
  ok('días hábiles, judiciales y feriados: NO se calculan; se pide la fecha exacta', () => {
    for (const frase of ['recordame en diez días hábiles', 'avisame dentro de 5 días judiciales', 'recordame antes del feriado'])
      assert.equal(resolver(frase).pendiente.motivo, 'habiles', frase);
    assert.match(resolver('recordame en 10 días hábiles').pendiente.mensaje, /No calculo días hábiles/);
    // Con una fecha exacta dicha, sí se sigue.
    assert.equal(resolver('recordame el 30 de octubre, son días hábiles').pendiente, null);
  });
  ok('sin fecha: pregunta; fecha pasada: no se programa', () => {
    assert.equal(resolver('recordame revisar el contrato').pendiente.motivo, 'sin_fecha');
    assert.equal(resolver('recordame').pendiente.motivo, 'sin_fecha');
    assert.equal(resolver('recordame hoy a las 8').pendiente.motivo, 'pasada'); // 8:00 ya pasó (son las 10:00)
    assert.match(resolver('recordame hoy a las 8').pendiente.mensaje, /Esa fecha ya pasó/);
    assert.equal(resolver('recordame el 10 de octubre de 2020').pendiente.motivo, 'pasada');
  });
  ok('recurrencia: «el 15 de cada mes», día 31, semanal y diaria; sin dato, pregunta', () => {
    const m = resolver('Recordame pagar el 15 de cada mes');
    assert.deepEqual(m.repeticion, { tipo: 'mensual', dia: 15 });
    assert.deepEqual(m.fecha, f(2026, 10, 15)); // hoy es 21: el próximo 15 es en octubre
    assert.equal(interpretarRecordatorio('Recordame pagar el 15 de cada mes', AHORA).titulo, 'Pagar');
    assert.equal(interpretarRecordatorio('Recordame pagar el 15 de cada mes', AHORA).tipo, 'pago');
    assert.equal(M.fraseDeConfirmacion(m), 'Crearé un recordatorio mensual el día 15 a las 9:00. ¿Está bien?');
    const treinta1 = resolver('recordame el día 31 de cada mes');
    assert.deepEqual(treinta1.fecha, f(2026, 9, 30)); // septiembre tiene 30: el último día
    assert.equal(treinta1.avisos.length, 1);
    const sem = resolver('recordame todos los lunes a las 8 de la mañana');
    assert.deepEqual(sem.repeticion, { tipo: 'semanal', diaSemana: 1 });
    assert.deepEqual(sem.fecha, f(2026, 9, 28)); // hoy es lunes pero las 8:00 ya pasó
    assert.deepEqual(resolver('recordame cada semana el jueves').repeticion, { tipo: 'semanal', diaSemana: 4 });
    const dia = resolver('recordame todos los días a las 9');
    assert.deepEqual(dia.repeticion, { tipo: 'diaria' });
    assert.deepEqual(dia.fecha, f(2026, 9, 22)); // las 9:00 de hoy ya pasó
    assert.equal(resolver('recordame cada mes').pendiente.motivo, 'dia_mes');
    assert.equal(resolver('recordame cada semana').pendiente.motivo, 'dia_semana');
  });
  ok('editar: cambiar solo la hora conserva la fecha; solo la fecha conserva la hora', () => {
    const base = { fecha: f(2026, 10, 8), hora: { hora: 9, minuto: 0 } };
    const soloHora = resolver('cambiá el recordatorio para las 4', { base });
    assert.deepEqual(soloHora.fecha, f(2026, 10, 8));
    assert.deepEqual(soloHora.hora, { hora: 16, minuto: 0 });
    const soloFecha = resolver('pasalo para mañana', { base });
    assert.deepEqual(soloFecha.fecha, f(2026, 9, 22));
    assert.deepEqual(soloFecha.hora, { hora: 9, minuto: 0 });
    assert.equal(soloFecha.horaOrigen, 'dicha');
  });
  ok('lo que NO es un pedido de fecha no inventa datos', () => {
    for (const frase of ['¿Cuál es el plazo para cancelar un contrato?', '¿Qué significa recordatorio de pago?',
      'explicame la cláusula quinta', 'el artículo 340 del Código Civil'])
      assert.equal(interpretarRecordatorio(frase, AHORA).hayDatosDeFecha, false, frase);
  });
  const REC = (extra = {}) => ({ id: 'r1', notificationIds: ['n1'], titulo: 'Revisar contrato', tipo: 'vencimiento',
    fechaHora: '2026-10-08T09:00', zona: 'America/La_Paz', documentoId: 'd1', documentoNombre: 'contrato_arrendamiento.pdf',
    fechaReferencia: '2026-10-15', creadoEn: '2026-09-21T10:00:00.000Z', estado: 'programado', ...extra });
  ok('persistencia: ida y vuelta, y lo corrupto se descarta sin romper', () => {
    const lista = [REC(), REC({ id: 'r2', repeticion: { tipo: 'mensual', dia: 15 }, tipo: 'pago', fechaReferencia: undefined })];
    assert.deepEqual(M.parsearRecordatorios(M.serializarRecordatorios(lista)), JSON.parse(JSON.stringify(lista)));
    assert.deepEqual(M.parsearRecordatorios(null), []);
    assert.deepEqual(M.parsearRecordatorios('esto no es json'), []);
    assert.deepEqual(M.parsearRecordatorios('{"version":1,"items":"x"}'), []);
    const mezcla = JSON.stringify({ version: 1, items: [REC(), { id: 'malo' }, REC({ id: 'r3', fechaHora: 'mañana' }),
      REC({ id: 'r4', repeticion: { tipo: 'mensual', dia: 45 } }), REC({ id: 'r5', tipo: 'inventado' }), 7, null] });
    assert.deepEqual(M.parsearRecordatorios(mezcla).map((r) => r.id), ['r1']);
  });
  ok('avisos mensuales de día 29–31: fin de mes en los meses cortos, bisiestos incluidos', () => {
    const h = { hora: 9, minuto: 0 };
    const cuatro = M.ocurrenciasMensuales(31, h, new Date(2026, 0, 31, 10, 0), 4).map((x) => F.fechaCorta(x));
    assert.deepEqual(cuatro, ['28/02/2026', '31/03/2026', '30/04/2026', '31/05/2026']);
    assert.deepEqual(M.ocurrenciasMensuales(30, h, new Date(2028, 0, 15), 2).map((x) => F.fechaCorta(x)), ['30/01/2028', '29/02/2028']);
    assert.equal(M.ocurrenciasMensuales(31, h, AHORA, 12).length, 12);
    assert.equal(M.usaOcurrenciasExplicitas({ tipo: 'mensual', dia: 29 }), true);
    assert.equal(M.usaOcurrenciasExplicitas({ tipo: 'mensual', dia: 28 }), false); // hasta el 28 sirve el mensual nativo
    assert.equal(M.usaOcurrenciasExplicitas({ tipo: 'semanal', diaSemana: 1 }), false);
  });
  ok('notificación: aviso genérico, sin contenido jurídico; anticipación real; nombre corto del documento', () => {
    const n = M.textoNotificacion(REC());
    assert.equal(n.titulo, 'Asistente Jurídico');
    assert.equal(n.cuerpo, 'Vencimiento en 7 días · contrato arrendamiento');
    assert.equal(M.textoNotificacion(REC({ fechaHora: '2026-10-14T09:00' })).cuerpo, 'Vencimiento mañana · contrato arrendamiento');
    assert.equal(M.textoNotificacion(REC({ fechaHora: '2026-10-15T09:00' })).cuerpo, 'Vencimiento hoy · contrato arrendamiento');
    assert.equal(M.textoNotificacion(REC({ fechaReferencia: undefined, documentoNombre: undefined })).cuerpo, 'Recordatorio: vencimiento');
    // Un pago no repite el título dictado (podría llevar datos): solo el aviso genérico.
    assert.equal(M.textoNotificacion(REC({ tipo: 'pago', titulo: 'Pagar 5000 Bs a Juan Pérez', documentoNombre: undefined })).cuerpo, 'Recordatorio de pago');
    assert.equal(M.nombreCorto('x'.repeat(50) + '.pdf').length, 30);
  });
  ok('lo que dice el asistente: confirmar, crear y editar con fecha y hora absolutas', () => {
    assert.equal(M.fraseDeCreado(REC(), HOY), 'Listo. Te recordaré el 8 de octubre a las 9.');
    assert.equal(M.fraseDeCreado(REC({ fechaHora: '2026-09-22T16:00' }), HOY), 'Listo. Te recordaré mañana a las 16.');
    assert.equal(M.fraseDeCreado(REC({ repeticion: { tipo: 'mensual', dia: 15 } }), HOY), 'Listo. Te recordaré mensual, el día 15 a las 9:00.');
    assert.equal(M.fraseDeEditado(REC({ fechaHora: '2026-09-22T16:30' }), HOY), 'Actualicé el recordatorio para mañana a las 16:30.');
    assert.equal(M.fechaHablada(f(2026, 9, 23), HOY), 'pasado mañana');
    assert.equal(M.describirRecurrencia({ tipo: 'semanal', diaSemana: 1 }, { hora: 8, minuto: 0 }), 'todos los lunes a las 8:00');
  });
  ok('reconciliar con Android: lo que ya no está programado no queda «activo»', () => {
    const plan = (items, ids, zona = 'America/La_Paz') => M.planReconciliar(items, new Set(ids), AHORA, zona).map((a) => a.tipo + (a.estado ? ':' + a.estado : ''));
    assert.deepEqual(plan([REC()], ['n1']), ['ok']);
    assert.deepEqual(plan([REC()], []), ['marcar:perdido']);                                      // futuro que Android perdió
    assert.deepEqual(plan([REC({ fechaHora: '2026-09-20T09:00' })], []), ['marcar:pasado']);      // ya sonó
    assert.deepEqual(plan([REC({ repeticion: { tipo: 'diaria' } })], []), ['marcar:perdido']);
    assert.deepEqual(plan([REC()], ['n1'], 'America/Lima'), ['reprogramar']);                     // cambió la zona: misma hora local
    assert.deepEqual(plan([REC({ estado: 'perdido' })], []), ['ok']);
    assert.deepEqual(plan([REC({ estado: 'pasado', fechaHora: '2026-08-01T09:00' })], []), ['purgar']);
    assert.deepEqual(plan([REC({ estado: 'pasado', fechaHora: '2026-09-15T09:00' })], []), ['ok']);
    const mensual = REC({ repeticion: { tipo: 'mensual', dia: 31 }, notificationIds: ['a', 'b'] });
    assert.deepEqual(plan([mensual], ['a', 'b']), ['rellenar']);                                   // faltan hasta el horizonte
    assert.deepEqual(plan([REC({ repeticion: { tipo: 'mensual', dia: 31 }, notificationIds: Array.from({ length: 12 }, (_, i) => 'n' + i) })],
      Array.from({ length: 12 }, (_, i) => 'n' + i)), ['ok']);
  });
  ok('duplicados: la misma solicitud tiene la misma clave', () => {
    assert.equal(M.claveDeDuplicado(REC()), M.claveDeDuplicado(REC({ id: 'otro', notificationIds: [] })));
    assert.notEqual(M.claveDeDuplicado(REC()), M.claveDeDuplicado(REC({ fechaHora: '2026-10-09T09:00' })));
    assert.notEqual(M.nuevoId(), M.nuevoId());
  });
  ok('fechas del documento: solo las que el backend ya extrajo, inequívocas y futuras', () => {
    const analisis = {
      clausulas: [{ orden: 5, encabezado: 'CLÁUSULA QUINTA: PLAZO', texto: 'El plazo es de 10 días hábiles y vence el 15 de octubre de 2026.' }],
      hallazgos: [
        { tipo: 'fecha', texto: '15 de octubre de 2026', inicio: 0, fin: 0, clausula: 5 },
        { tipo: 'fecha', texto: '15/10/2026', inicio: 0, fin: 0, clausula: null },   // la misma: no se repite
        { tipo: 'fecha', texto: '20 de marzo de 2020', inicio: 0, fin: 0, clausula: null }, // pasada: no sirve
        { tipo: 'fecha', texto: '31/02/2027', inicio: 0, fin: 0, clausula: null },    // imposible: se descarta
        { tipo: 'fecha', texto: '3-11-2026', inicio: 0, fin: 0, clausula: null },
        { tipo: 'monto_bs', texto: '2000', inicio: 0, fin: 0, clausula: null },
        { tipo: 'plazo', texto: '10 días', inicio: 0, fin: 0, clausula: 5 },
      ],
    };
    const fechas = M.fechasFuturasDelAnalisis(analisis, HOY);
    assert.deepEqual(fechas.map((x) => F.fechaCorta(x.fecha)), ['03/11/2026', '15/10/2026'].reverse());
    assert.equal(fechas[0].encabezado, 'CLÁUSULA QUINTA: PLAZO');
    assert.deepEqual(M.plazosEnDiasHabiles(analisis), ['10 días hábiles']);
    assert.deepEqual(M.fechasFuturasDelAnalisis({ clausulas: [], hallazgos: [] }, HOY), []);
    assert.deepEqual(M.parsearFechaDeDocumento('15 de setiembre de 2026'), f(2026, 9, 15));
    assert.equal(M.parsearFechaDeDocumento('quince de octubre'), null);
  });

  console.log('--- Recordatorios: órdenes de voz ---');
  ok('crear: «recordame…», «avisame…», «creá un recordatorio…»', () => {
    for (const frase of ['Recordame revisar este contrato mañana', 'Recordame una semana antes', 'Avisame tres días antes',
      'Recordame pagar el 15 de cada mes', 'Creá un recordatorio para el viernes a las 4', 'Avisame mañana a las 4',
      'Quiero un recordatorio para el 10 de octubre', 'Necesito que me recuerdes el lunes', 'Programá un recordatorio para mañana',
      'Recordame el viernes', 'Recordame'])
      assert.deepEqual(dice(frase), { tipo: 'recordatorio', accion: 'crear' }, frase);
  });
  ok('listar: «¿qué recordatorios tengo?»', () => {
    for (const frase of ['¿Qué recordatorios tengo?', 'Mostrame mis recordatorios', 'Ver los recordatorios', 'Cuáles recordatorios hay',
      'Tengo recordatorios pendientes', 'Dame la lista de recordatorios'])
      assert.deepEqual(dice(frase), { tipo: 'recordatorio', accion: 'listar' }, frase);
  });
  ok('cancelar y editar: piden el recordatorio por su nombre; «posponelo» y «pasalo» necesitan uno a la vista', () => {
    for (const frase of ['Cancelá el recordatorio del contrato', 'Eliminá el recordatorio', 'Borrá mi recordatorio', 'Anulá el aviso'])
      assert.deepEqual(dice(frase), { tipo: 'recordatorio', accion: 'cancelar' }, frase);
    for (const frase of ['Cambiá el recordatorio para las 4', 'Posponé el recordatorio', 'Modificá la hora del recordatorio', 'Reprogramá el recordatorio'])
      assert.deepEqual(dice(frase), { tipo: 'recordatorio', accion: 'editar' }, frase);
    assert.deepEqual(dice('Posponelo para mañana', { recordatorios: 2 }), { tipo: 'recordatorio', accion: 'editar' });
    assert.deepEqual(dice('Pasalo para mañana', { recordatorioAbierto: true }), { tipo: 'recordatorio', accion: 'editar' });
    assert.deepEqual(dice('Cancelalo', { recordatorioAbierto: true }), { tipo: 'recordatorio', accion: 'cancelar' });
    assert.equal(tipo('Pasalo para mañana'), 'consulta');      // sin recordatorio a la vista no hay a qué referirse
    assert.equal(tipo('Cancelalo'), 'consulta');
    assert.equal(tipo('Posponelo para mañana'), 'consulta');
  });
  ok('NO son recordatorios: preguntas jurídicas, aunque nombren «cancelar» o «recordatorio»', () => {
    const todo = { documentoActivo: true, analisis: true, generado: true, reporte: true, recordatorios: 3, recordatorioAbierto: true };
    for (const frase of ['¿Cuál es el plazo para cancelar un contrato?', '¿Qué significa recordatorio de pago?',
      '¿Es obligatorio un recordatorio de pago antes de demandar?', 'Cancelar un contrato de alquiler', '¿Cómo cancelo un contrato?',
      '¿Puedo posponer una audiencia?', '¿Qué debo recordar al firmar un contrato?', 'El aviso previo es obligatorio en el desahucio',
      '¿Qué dice el artículo 340 del Código Civil?', 'Explícame la cláusula quinta', 'Avisos legales en un contrato de préstamo'])
      assert.equal(tipo(frase, todo), 'consulta', frase);
  });
  ok('«sí» y «no» solo significan algo con una propuesta pendiente (nunca un «sí» global)', () => {
    const conf = { recordatorio: 'confirmacion' };
    for (const frase of ['Sí', 'Confirmar', 'Crealo', 'Dale', 'Sí, por favor', 'Está bien', 'Programalo'])
      assert.deepEqual(dice(frase, conf), { tipo: 'recordatorio_respuesta', accion: 'confirmar' }, frase);
    for (const frase of ['No', 'Cancelar', 'Dejalo', 'Olvidalo', 'Mejor no', 'Descartalo'])
      assert.deepEqual(dice(frase, conf), { tipo: 'recordatorio_respuesta', accion: 'rechazar' }, frase);
    for (const frase of ['Sí', 'No', 'Confirmar', 'Dale', 'Crealo']) assert.equal(tipo(frase), 'consulta', frase);
    assert.deepEqual(dice('Sí', { recordatorio: 'oferta' }), { tipo: 'recordatorio_respuesta', accion: 'confirmar' });
    // Cancelar un recordatorio: «sí» lo cancela, «no» lo conserva.
    const canc = { recordatorio: 'cancelacion' };
    assert.deepEqual(dice('Sí', canc), { tipo: 'recordatorio_respuesta', accion: 'confirmar' });
    assert.deepEqual(dice('Cancelar', canc), { tipo: 'recordatorio_respuesta', accion: 'confirmar' });
    assert.deepEqual(dice('No', canc), { tipo: 'recordatorio_respuesta', accion: 'rechazar' });
    assert.deepEqual(dice('Volver', canc), { tipo: 'recordatorio_respuesta', accion: 'rechazar' });
  });
  ok('con una propuesta pendiente, una fecha u hora nueva la ajusta; lo demás sigue su camino', () => {
    const conf = { recordatorio: 'confirmacion' };
    for (const frase of ['Mejor el viernes', 'A las 5', 'Cambialo para mañana a las 4', 'El 20 de octubre', 'Una semana antes'])
      assert.deepEqual(dice(frase, conf), { tipo: 'recordatorio_respuesta', accion: 'ajustar' }, frase);
    assert.equal(tipo('¿Qué dice el artículo 340 del Código Civil?', conf), 'consulta');
    assert.equal(tipo('Explicame con detalle qué obligaciones tiene el arrendatario según el contrato que analizamos hoy', conf), 'consulta');
    assert.equal(tipo('Mejor el viernes', { recordatorio: 'cancelacion' }), 'consulta');
    assert.equal(tipo('Mejor el viernes'), 'consulta');
    // Una orden nueva de recordatorio con algo pendiente es esa orden.
    assert.deepEqual(dice('Recordame el viernes', conf), { tipo: 'recordatorio', accion: 'crear' });
  });
  ok('no rompe el resto: «cancelar» de la comparación, la generación y el escaneo siguen igual', () => {
    assert.deepEqual(dice('Cancelar', { flujo: 'comparacion' }), { tipo: 'flujo', accion: 'cancelar' });
    assert.deepEqual(dice('Cancelá el recordatorio del contrato', { flujo: 'comparacion' }), { tipo: 'recordatorio', accion: 'cancelar' });
    assert.deepEqual(dice('Recordame mañana', { flujo: 'generacion' }), { tipo: 'flujo', accion: 'responder' }); // la generación por voz se queda con su respuesta
    assert.deepEqual(dice('Analizalo', { flujo: 'escaneo' }), { tipo: 'analizar_escaneo' });
    assert.equal(tipo('Generame un contrato de préstamo'), 'generar_documento');
    assert.equal(tipo('Compará este contrato con otro', { documentoActivo: true }), 'comparar');
  });

  console.log('--- Recordatorios: propuesta y confirmación ---');
  const DOC = { id: 'd1', nombre: 'contrato_arrendamiento.pdf' };
  const propuestaDe = (frase, ctx = {}) => P.propuestaDesde(interpretarRecordatorio(frase, AHORA), AHORA, ctx);
  ok('experiencia 1: «una semana antes» de la fecha del documento → propuesta a CONFIRMAR, nada programado', () => {
    const oferta = P.propuestaDeFechaDeDocumento(f(2026, 10, 15), DOC, 'oferta');
    assert.equal(oferta.modo, 'oferta');
    assert.equal(P.listaParaConfirmar(oferta), false);                 // una oferta NO se puede confirmar sin pasar por «confirmacion»
    const p = propuestaDe('Recordame una semana antes', { referencia: oferta.referencia, documento: DOC, modo: 'confirmacion' });
    assert.deepEqual(p.fecha, f(2026, 10, 8));
    assert.deepEqual(p.hora, { hora: 9, minuto: 0 });
    assert.deepEqual(p.referencia, f(2026, 10, 15));
    assert.equal(p.pendiente, null);
    assert.equal(P.listaParaConfirmar(p), true);
    assert.equal(M.fraseDeConfirmacion(p), 'La fecha es el 15 de octubre de 2026. ¿Querés que te recuerde el 8 de octubre de 2026 a las 9:00?');
  });
  ok('experiencia 2: «pagar el 15 de cada mes» → propuesta mensual a las 9:00, a confirmar', () => {
    const p = propuestaDe('Recordame pagar el 15 de cada mes');
    assert.deepEqual(p.repeticion, { tipo: 'mensual', dia: 15 });
    assert.equal(p.titulo, 'Pagar');
    assert.equal(p.tipo, 'pago');
    assert.equal(P.listaParaConfirmar(p), true);
  });
  ok('sin fecha o con fecha pasada: NO se puede confirmar', () => {
    assert.equal(P.listaParaConfirmar(propuestaDe('recordame revisar el contrato')), false);
    assert.equal(P.listaParaConfirmar(propuestaDe('recordame hoy a las 8')), false);
    assert.equal(P.listaParaConfirmar(null), false);
    assert.equal(propuestaDe('recordame en diez días hábiles').pendiente.motivo, 'habiles');
  });
  ok('cambiar fecha u hora con el selector: se revalida y la hora elegida deja de ser «inferida»', () => {
    let p = propuestaDe('avisame mañana a las 4');
    assert.equal(p.horaOrigen, 'inferida');
    p = P.conHora(p, { hora: 17, minuto: 30 }, AHORA);
    assert.equal(p.horaOrigen, 'dicha');
    assert.deepEqual(p.hora, { hora: 17, minuto: 30 });
    p = P.conFecha(p, f(2026, 10, 3), AHORA);
    assert.deepEqual(p.fecha, f(2026, 10, 3));
    assert.equal(P.listaParaConfirmar(p), true);
    // Elegir la fecha de hoy con una hora que ya pasó vuelve a bloquear.
    const hoyPasado = P.conFecha(P.conHora(p, { hora: 8, minuto: 0 }, AHORA), HOY, AHORA);
    assert.equal(hoyPasado.pendiente.motivo, 'pasada');
    assert.equal(P.listaParaConfirmar(hoyPasado), false);
  });
  ok('revalidar justo antes de confirmar: la hora se pasó mientras el usuario decidía', () => {
    const p = propuestaDe('avisame hoy a las 11'); // son las 10:00: futuro
    assert.equal(P.listaParaConfirmar(P.revalidar(p, AHORA)), true);
    const mas = new Date(2026, 8, 21, 11, 0, 1);   // el usuario tardó: ya pasó
    const r = P.revalidar(p, mas);
    assert.equal(r.pendiente.motivo, 'pasada');
    assert.equal(P.listaParaConfirmar(r), false);
  });
  ok('recurrencia: cambiar la fecha en el selector cambia el DÍA del que se repite', () => {
    const mensual = propuestaDe('recordame pagar el 15 de cada mes');
    const c = P.conFecha(mensual, f(2026, 11, 20), AHORA);
    assert.deepEqual(c.repeticion, { tipo: 'mensual', dia: 20 });
    assert.deepEqual(c.fecha, f(2026, 10, 20)); // el 20 de septiembre ya pasó (hoy es 21): el próximo es en octubre
    const semanal = P.conFecha(propuestaDe('todos los lunes a las 8'), f(2026, 10, 2), AHORA); // viernes
    assert.deepEqual(semanal.repeticion, { tipo: 'semanal', diaSemana: 5 });
  });
  ok('recordatorio sobre uno abierto: «recordame mañana» hereda título, tipo y documento (uno NUEVO)', () => {
    const abierto = REC({ titulo: 'Revisar contrato', tipo: 'revision' });
    const p = propuestaDe('Recordame mañana', { tituloBase: abierto.titulo, tipoBase: abierto.tipo, documento: DOC });
    assert.equal(p.titulo, 'Revisar contrato');
    assert.equal(p.tipo, 'revision');
    assert.deepEqual(p.documento, DOC);
    assert.deepEqual(p.fecha, f(2026, 9, 22));
    assert.equal(p.editandoId, null);
  });
  ok('editar solo la hora conserva la fecha vigente del recordatorio', () => {
    const rec = REC();
    const base = P.baseDeRecordatorio(rec, AHORA);
    const p = propuestaDe('cambiá el recordatorio para las 4', { base, editandoId: rec.id, tituloBase: rec.titulo });
    assert.deepEqual(p.fecha, f(2026, 10, 8));
    assert.deepEqual(p.hora, { hora: 16, minuto: 0 });
    assert.equal(p.editandoId, 'r1');
    assert.match(M.fraseDeEditado({ ...rec, fechaHora: '2026-10-08T16:00' }, HOY), /^Actualicé el recordatorio para el 8 de octubre a las 16\.$/);
  });
  ok('cancelar: se busca por título o documento; con varios posibles NO se adivina', () => {
    const lista = [REC({ id: 'a', titulo: 'Revisar contrato', documentoNombre: 'contrato_arrendamiento.pdf' }),
      REC({ id: 'b', titulo: 'Pago mensual', documentoNombre: undefined, tipo: 'pago' }),
      REC({ id: 'c', titulo: 'Firmar minuta', documentoNombre: 'minuta_compraventa.pdf' })];
    assert.deepEqual(P.palabrasClave('Cancelá el recordatorio del contrato'), ['contrato']);
    assert.deepEqual(P.buscarRecordatorios(lista, 'Cancelá el recordatorio del contrato').map((r) => r.id), ['a']);
    assert.deepEqual(P.buscarRecordatorios(lista, 'cancelá el recordatorio del pago').map((r) => r.id), ['b']);
    assert.deepEqual(P.buscarRecordatorios(lista, 'cancelá el recordatorio').map((r) => r.id), ['a', 'b', 'c']); // sin pista: el que llama pide elegir
    assert.deepEqual(P.buscarRecordatorios(lista, 'cancelá el recordatorio de la audiencia'), []);
    assert.deepEqual(P.buscarRecordatorios([...lista, REC({ id: 'x', estado: 'pasado', titulo: 'contrato viejo' })], 'contrato').map((r) => r.id), ['a']);
  });

  console.log(`\n${total} pruebas OK`);
} finally {
  rmSync(salida, { recursive: true, force: true });
}
