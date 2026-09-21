/**
 * Lógica del dictado que no depende de ningún módulo nativo (se puede probar sola).
 */

export type TipoErrorDictado =
  | 'web' | 'expo_go' | 'sin_modulo' | 'sin_servicio'
  | 'permiso' | 'sin_voz' | 'red' | 'audio' | 'idioma' | 'ocupado' | 'desconocido';

export const MENSAJES_DICTADO: Record<TipoErrorDictado, string> = {
  web: 'El dictado por voz solo está disponible en la app del celular.',
  expo_go:
    'El dictado por voz necesita la app de desarrollo: Expo Go no incluye el reconocimiento de voz. Mientras tanto, puedes usar el micrófono de tu teclado.',
  sin_modulo:
    'Esta versión de la app no incluye el reconocimiento de voz. Puedes usar el micrófono de tu teclado.',
  sin_servicio:
    'Tu teléfono no tiene un servicio de reconocimiento de voz disponible. Activa «Servicios de voz de Google» o usa el micrófono de tu teclado.',
  permiso:
    'Necesito permiso para usar el micrófono. Puedes activarlo en Ajustes > Aplicaciones > Permisos.',
  sin_voz: 'No te escuché. Toca el micrófono e inténtalo de nuevo.',
  red:
    'El reconocimiento de voz de tu teléfono necesita internet ahora mismo. Descarga el español sin conexión en Ajustes > Idioma > Voz, o escribe tu consulta.',
  audio: 'No pude acceder al micrófono. Comprueba que otra aplicación no lo esté usando.',
  idioma: 'Tu teléfono no admite reconocimiento de voz en español.',
  ocupado: 'El reconocimiento de voz está ocupado. Espera un momento e inténtalo otra vez.',
  desconocido: 'No pude transcribir tu voz. Inténtalo de nuevo o escribe tu consulta.',
};

/** Traduce el código de error del reconocedor. `aborted` (cancelación propia) no es un error. */
export function clasificarError(codigo: string): TipoErrorDictado | null {
  switch (codigo) {
    case 'aborted': return null;
    case 'no-speech': case 'nomatch': return 'sin_voz';
    case 'not-allowed': return 'permiso';
    case 'network': return 'red';
    case 'audio-capture': return 'audio';
    case 'language-not-supported': return 'idioma';
    case 'busy': return 'ocupado';
    case 'service-not-allowed': return 'sin_servicio';
    default: return 'desconocido';
  }
}

const PREFERIDOS = ['es-bo', 'es-419', 'es-us', 'es-mx', 'es-ar', 'es-es'];
const normalizar = (idioma: string) => idioma.toLowerCase().replace('_', '-');
const esEspanol = (idioma: string) => normalizar(idioma).startsWith('es');

/** El reconocedor espera etiquetas BCP-47 (es-MX); Android a veces informa es_MX. */
const aBcp47 = (idioma: string) => idioma.replace('_', '-');

function mejorEspanol(lista: string[]): string | undefined {
  for (const preferido of PREFERIDOS) {
    const hallado = lista.find((l) => normalizar(l) === preferido);
    if (hallado) return aBcp47(hallado);
  }
  const cualquiera = lista.find(esEspanol);
  return cualquiera ? aBcp47(cualquiera) : undefined;
}

export interface EleccionIdioma {
  lang: string;
  /** true si el español está instalado en el dispositivo: puede reconocerse sin red. */
  enDispositivo: boolean;
}

/**
 * Prefiere un español ya instalado en el teléfono (reconocimiento local, sin red).
 * Si no hay ninguno, usa el español que soporte el reconocedor del sistema, que puede
 * consultar un servidor del fabricante: por eso `enDispositivo` es false y la interfaz lo
 * dice.
 */
export function elegirIdioma(soportados: string[], instalados: string[]): EleccionIdioma {
  const local = mejorEspanol(instalados);
  if (local) return { lang: local, enDispositivo: true };
  return { lang: mejorEspanol(soportados) ?? 'es-ES', enDispositivo: false };
}

/** Términos del dominio que un reconocedor general suele confundir. */
export const VOCABULARIO_JURIDICO = [
  'mora', 'arrendamiento', 'arrendatario', 'inmueble', 'usucapión', 'servidumbre',
  'resarcimiento', 'cláusula', 'enajenación', 'desahucio', 'Código Civil', 'obligación',
];

export type EstadoDescarga = 'opened_dialog' | 'download_success' | 'download_scheduled';

/** Qué le pasó a la descarga del español sin conexión, dicho para quien está usando el teléfono. */
export function mensajeDescarga(estado: EstadoDescarga | 'error'): string {
  switch (estado) {
    case 'opened_dialog':
      return 'Se abrió el cuadro del sistema para descargar el español sin conexión. Acepta la descarga y, cuando termine, vuelve a tocar el micrófono.';
    case 'download_success':
      return 'Listo: el español sin conexión quedó instalado. Toca el micrófono para dictar sin internet.';
    case 'download_scheduled':
      return 'La descarga del español sin conexión quedó programada (puede esperar a tener wifi). Cuando termine, el dictado funcionará sin internet.';
    default:
      return 'No pude iniciar la descarga del idioma. Puedes instalarlo en Ajustes > Seguridad y privacidad > Más ajustes de privacidad > Android System Intelligence > Reconocimiento de voz en el dispositivo.';
  }
}
