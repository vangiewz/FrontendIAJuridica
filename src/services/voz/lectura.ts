import * as Speech from 'expo-speech';
import { Platform } from 'react-native';
import { dividirEnTramos, textoParaLectura } from './textoLectura';

/**
 * Lectura de respuestas con la voz DEL DISPOSITIVO (Android TextToSpeech / iOS
 * AVSpeechSynthesizer). El texto no sale del teléfono: no hay API de voz en la nube.
 *
 * Solo hay un motor y una lectura a la vez. La lectura la inicia siempre el usuario;
 * nada se lee automáticamente.
 */

/** En web el navegador puede usar voces de servidores de terceros: no se ofrece. */
export const LECTURA_DISPONIBLE = Platform.OS !== 'web';

export interface EstadoLectura {
  /** Identificador de la respuesta que se está leyendo, o null. */
  id: string | null;
  /** Mensaje del último fallo y la respuesta a la que corresponde. */
  error: string | null;
  idError: string | null;
}

const PREFERIDAS = ['es-bo', 'es-419', 'es-us', 'es-mx', 'es-ar', 'es-es'];
const SIN_VOZ =
  'Tu teléfono no tiene una voz en español instalada sin conexión. Instálala en Ajustes > Idioma y entrada > Salida de texto a voz.';

let estado: EstadoLectura = { id: null, error: null, idError: null };
let turno = 0;
const oyentes = new Set<() => void>();
let voces: Speech.Voice[] | null = null;

function cambiar(nuevo: EstadoLectura) {
  estado = nuevo;
  oyentes.forEach((oyente) => oyente());
}

export const obtenerEstadoLectura = () => estado;
export function suscribirLectura(oyente: () => void) {
  oyentes.add(oyente);
  return () => { oyentes.delete(oyente); };
}

const normalizar = (idioma: string) => idioma.toLowerCase().replace('_', '-');

/**
 * Voz en español, del propio dispositivo. Se descartan las voces que necesitan red
 * (en Android los identificadores terminan en «-network»): mandarían el texto a un
 * servidor. Si el sistema no informa voces, se deja que use su voz por defecto.
 */
async function elegirVoz(): Promise<{ voz?: string; idioma: string } | null> {
  if (!voces) {
    try { voces = await Speech.getAvailableVoicesAsync(); } catch { voces = []; }
  }
  if (!voces.length) return { idioma: 'es-ES' };
  const espanolas = voces.filter((v) => normalizar(v.language).startsWith('es'));
  const locales = espanolas.filter((v) => !/network/i.test(v.identifier));
  if (!locales.length) return null;
  const rango = (v: Speech.Voice) => {
    const i = PREFERIDAS.indexOf(normalizar(v.language));
    return i === -1 ? PREFERIDAS.length : i;
  };
  const mejor = [...locales].sort((a, b) => rango(a) - rango(b))[0];
  return { voz: mejor.identifier, idioma: mejor.language };
}

export async function leer(id: string, respuesta: string): Promise<void> {
  detener();
  const mio = ++turno;
  const texto = textoParaLectura(respuesta);
  if (!texto) return;
  cambiar({ id, error: null, idError: null });

  const voz = await elegirVoz();
  if (mio !== turno) return;
  if (!voz) {
    cambiar({ id: null, error: SIN_VOZ, idError: id });
    return;
  }

  const tramos = dividirEnTramos(texto, Math.min(Speech.maxSpeechInputLength, 3000));
  const terminar = (error: string | null = null) => {
    if (mio === turno) cambiar({ id: null, error, idError: error ? id : null });
  };
  let indice = 0;
  const siguiente = () => {
    if (mio !== turno) return;
    if (indice >= tramos.length) return terminar();
    Speech.speak(tramos[indice++], {
      language: voz.idioma,
      ...(voz.voz ? { voice: voz.voz } : {}),
      rate: 0.95,
      onDone: siguiente,
      onStopped: () => terminar(),
      onError: () => terminar('No pude reproducir la respuesta con la voz del teléfono.'),
    });
  };
  siguiente();
}

/** Corta la lectura en curso. Es seguro llamarla aunque no haya nada sonando. */
export function detener() {
  turno += 1;
  if (estado.id !== null || estado.error !== null) cambiar({ id: null, error: null, idError: null });
  void Speech.stop().catch(() => undefined);
}
