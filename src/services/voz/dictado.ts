import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import {
  clasificarError, elegirIdioma, EstadoDescarga, TipoErrorDictado, VOCABULARIO_JURIDICO,
} from './dictadoPuro';

/**
 * Dictado (voz → texto) con el reconocedor NATIVO del teléfono, a través de
 * `expo-speech-recognition`. No se usa ninguna API de terceros: ni OpenAI, ni Google
 * Cloud Speech, ni Azure, ni AWS.
 *
 * Ese módulo es código nativo y NO está incluido en Expo Go: necesita una «development
 * build». Por eso se carga de forma perezosa y dentro de try/catch: en Expo Go la app
 * funciona igual y el botón de micrófono explica por qué no está disponible, en lugar de
 * romper el arranque.
 *
 * Privacidad: si el español está instalado en el teléfono se pide reconocimiento
 * «en dispositivo» (el audio no sale del teléfono). Si no lo está, Android usa su
 * reconocedor del sistema, que puede consultar servidores de Google según el equipo:
 * `enDispositivo` lo informa y la interfaz lo muestra. En Android 13+ el idioma se puede
 * instalar desde la propia app (`instalarEspanolSinConexion`), siempre a pedido del usuario.
 */

type Modulo = typeof import('expo-speech-recognition').ExpoSpeechRecognitionModule;

let cache: Modulo | null | undefined;

/** Diagnóstico solo en desarrollo: en una build de depuración se ve en el log de Metro. */
const registrar = (...datos: unknown[]) => {
  if (__DEV__) console.log('[dictado]', ...datos);
};

function cargarModulo(): Modulo | null {
  if (cache !== undefined) return cache;
  if (Platform.OS === 'web') return (cache = null); // en web sería el servicio del navegador
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cache = require('expo-speech-recognition').ExpoSpeechRecognitionModule as Modulo;
  } catch {
    cache = null;
  }
  return cache;
}

export type Disponibilidad =
  | { disponible: true }
  | { disponible: false; motivo: TipoErrorDictado };

export function comprobarDictado(): Disponibilidad {
  if (Platform.OS === 'web') return { disponible: false, motivo: 'web' };
  const modulo = cargarModulo();
  if (!modulo) {
    const enExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
    return { disponible: false, motivo: enExpoGo ? 'expo_go' : 'sin_modulo' };
  }
  try {
    if (!modulo.isRecognitionAvailable()) return { disponible: false, motivo: 'sin_servicio' };
  } catch {
    return { disponible: false, motivo: 'sin_servicio' };
  }
  return { disponible: true };
}

/** El permiso se pide al tocar el micrófono, nunca al abrir la app. */
export async function pedirPermisoMicrofono(): Promise<{ concedido: boolean; puedePreguntar: boolean }> {
  const modulo = cargarModulo();
  if (!modulo) return { concedido: false, puedePreguntar: false };
  const respuesta = await modulo.requestPermissionsAsync();
  return { concedido: respuesta.granted, puedePreguntar: respuesta.canAskAgain };
}

export interface ManejadoresDictado {
  alEscuchar: () => void;
  /** El usuario dejó de hablar; falta el resultado final. */
  alFinDeHabla: () => void;
  alParcial: (texto: string) => void;
  /** Una sola vez, con el mejor texto reconocido. */
  alFinal: (texto: string) => void;
  alError: (tipo: TipoErrorDictado) => void;
}

export interface SesionDictado {
  /** El reconocimiento corre en el teléfono: el audio no sale de él. */
  enDispositivo: boolean;
  /** El teléfono sabe reconocer en local pero falta el español: se puede instalar. */
  puedeInstalarIdioma: boolean;
  /** Termina de escuchar y entrega el texto reconocido. */
  detener: () => void;
  /** Descarta todo: no se entrega ningún texto. */
  cancelar: () => void;
}

export async function iniciarDictado(manejadores: ManejadoresDictado): Promise<SesionDictado> {
  const modulo = cargarModulo();
  if (!modulo) throw new Error('modulo_no_disponible');

  let soportados: string[] = [];
  let instalados: string[] = [];
  try {
    // Vacío en Android 12 o anterior: entonces se usa es-ES y se declara que no es local.
    const idiomas = await modulo.getSupportedLocales({});
    soportados = idiomas.locales;
    instalados = idiomas.installedLocales;
  } catch { /* se sigue con los valores por defecto */ }

  const { lang, enDispositivo } = elegirIdioma(soportados, instalados);
  let sabeLocal = false;
  try { sabeLocal = modulo.supportsOnDeviceRecognition(); } catch { /* no local */ }
  const local = enDispositivo && sabeLocal;
  registrar('inicio', {
    lang, local, sabeLocal, soportados: soportados.length, instalados,
    servicios: (() => { try { return modulo.getSpeechRecognitionServices(); } catch { return []; } })(),
  });

  let ultimo = '';
  let cerrada = false;
  let cancelada = false;
  let conError = false;

  const suscripciones = [
    modulo.addListener('start', () => { registrar('evento start'); manejadores.alEscuchar(); }),
    modulo.addListener('speechend', () => { registrar('evento speechend'); manejadores.alFinDeHabla(); }),
    modulo.addListener('result', (evento) => {
      const texto = evento.results?.[0]?.transcript?.trim() ?? '';
      registrar('evento result', { final: evento.isFinal, caracteres: texto.length });
      if (!texto) return;
      ultimo = texto;
      manejadores.alParcial(texto);
    }),
    modulo.addListener('error', (evento) => {
      registrar('evento error', evento.error, evento.message);
      const tipo = clasificarError(evento.error);
      if (!tipo || cancelada) return;
      conError = true;
      manejadores.alError(tipo);
    }),
    modulo.addListener('end', () => {
      registrar('evento end', { conTexto: ultimo.length > 0, cancelada, conError });
      if (cerrada) return;
      cerrada = true;
      suscripciones.forEach((s) => s.remove());
      if (cancelada || conError) return;
      if (ultimo) manejadores.alFinal(ultimo);
      else manejadores.alError('sin_voz');
    }),
  ];

  try {
    modulo.start({
      lang,
      interimResults: true,
      continuous: false,
      maxAlternatives: 1,
      addsPunctuation: true,
      requiresOnDeviceRecognition: local,
      contextualStrings: VOCABULARIO_JURIDICO,
    });
  } catch (error) {
    // Si `start` falla no habrá evento `end`: sin esto los oyentes quedarían colgados.
    cerrada = true;
    suscripciones.forEach((s) => s.remove());
    throw error;
  }

  return {
    enDispositivo: local,
    puedeInstalarIdioma: Platform.OS === 'android' && sabeLocal && !local,
    detener: () => modulo.stop(),
    cancelar: () => {
      cancelada = true;
      if (!cerrada) {
        cerrada = true;
        suscripciones.forEach((s) => s.remove());
      }
      modulo.abort();
    },
  };
}

/**
 * Pide a Android que descargue el español para reconocer sin conexión (Android 13+).
 * Lo hace el sistema con su propio diálogo y siempre a pedido del usuario: la app no
 * descarga nada por su cuenta.
 */
export async function instalarEspanolSinConexion(): Promise<EstadoDescarga> {
  const modulo = cargarModulo();
  if (!modulo || Platform.OS !== 'android') throw new Error('no_disponible');
  let soportados: string[] = [];
  try { soportados = (await modulo.getSupportedLocales({})).locales; } catch { /* es-ES */ }
  const { lang } = elegirIdioma(soportados, []);
  registrar('descarga de idioma', lang);
  const resultado = await modulo.androidTriggerOfflineModelDownload({ locale: lang });
  registrar('descarga de idioma: resultado', resultado.status);
  return resultado.status;
}
