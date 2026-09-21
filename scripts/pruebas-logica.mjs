// Pruebas de la lógica pura de la app móvil (sin dispositivo, sin red, sin Expo).
//
//   npm run test:logica
//
// Compila con `tsc` solo los módulos que no dependen de React Native y los ejercita con
// `node:assert`. Cubre: resolución de la URL del backend, texto para leer en voz alta,
// elección de idioma y errores del dictado, y etapas del análisis.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
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

  console.log(`\n${total} pruebas OK`);
} finally {
  rmSync(salida, { recursive: true, force: true });
}
