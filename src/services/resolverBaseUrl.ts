/**
 * Decide a qué servidor le habla la app. Función pura: no importa nada de React Native,
 * así que se puede probar sola y no depende de la plataforma.
 *
 * Una sola variable manda: `EXPO_PUBLIC_API_URL`. Es la misma que está cargada en Vercel,
 * y en local vive en un `.env` que NO se versiona, donde se comenta una línea u otra para
 * saltar entre el backend de la PC y el de producción.
 *
 * Sin esa variable hay dos respaldos, en este orden:
 *
 *   1. El host del servidor de Metro, que es la PC que está sirviendo la app. Es lo que
 *      hace que durante `expo start` el teléfono llegue al backend sin configurar nada.
 *   2. Producción. Es el destino correcto para un APK repartido o para el build de Vercel,
 *      donde no hay Metro del que sacar una dirección.
 */
export const PUERTO_BACKEND = 8000;
/** Produccion. Es el destino cuando no hay ni variable ni Metro de donde deducir la PC. */
const CLOUD_POR_DEFECTO = 'https://ia-juridica-api.azurewebsites.net';

export interface EntornoUrl {
  /** Valor de EXPO_PUBLIC_API_URL. Si está, gana sobre todo lo demás. */
  variable?: string | null;
  /** `host:puerto` del servidor de desarrollo (Constants.expoConfig.hostUri). */
  hostUri?: string | null;
  /** Plataforma de React Native ('android', 'ios', 'web'). Hoy no cambia la decisión. */
  plataforma?: string;
}

/** Los túneles de Expo (exp.direct, ngrok) no son la PC: no sirven para llegar al backend. */
const ES_TUNEL = /(?:^|\.)(?:exp\.direct|ngrok[\w-]*\.\w+|loca\.lt|trycloudflare\.com)$/i;

export function resolverBaseUrl({ variable, hostUri }: EntornoUrl): string {
  const explicita = limpiarUrl(variable);
  if (explicita) return explicita;

  // Hay hostUri solo mientras Metro sirve la app, asi que esta rama es siempre desarrollo:
  // el backend vive en la misma PC que el empaquetador.
  if (hostUri) {
    const host = hostUri.trim().replace(/^[a-z]+:\/\//i, '').split('/')[0].split(':')[0];
    if (host && !ES_TUNEL.test(host)) return `http://${host}:${PUERTO_BACKEND}`;
  }

  // Sin variable y sin Metro: es un APK repartido o el build de Vercel. Va a produccion.
  return CLOUD_POR_DEFECTO;
}

function limpiarUrl(url: string | null | undefined): string {
  return (url ?? '').trim().replace(/\/+$/, '');
}

/** `192.168.X.X:8000` para mostrar en mensajes: nunca incluye credenciales ni ruta. */
export function describirServidor(baseUrl: string): string {
  return baseUrl.replace(/^[a-z]+:\/\//i, '').split('/')[0];
}
