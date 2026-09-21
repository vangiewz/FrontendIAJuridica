/**
 * Decide a qué servidor le habla la app. Función pura: no importa nada de React Native,
 * así que se puede probar sola y no depende de la plataforma.
 *
 * EXPO_PUBLIC_USE_LOCAL_API es la única selección de modo: solo el texto "true"
 * activa local; cualquier otro valor usa cloud. Las URLs se mantienen separadas para
 * poder cambiar de modo sin modificar TypeScript ni los servicios.
 */
export const PUERTO_BACKEND = 8000;
const LOCAL_POR_DEFECTO = `http://127.0.0.1:${PUERTO_BACKEND}`;
const CLOUD_POR_DEFECTO = 'https://ia-juridica-api.azurewebsites.net';

export interface EntornoUrl {
  /** Valor de EXPO_PUBLIC_USE_LOCAL_API. Solo 'true' activa local. */
  usarLocal?: string | null;
  /** URL local configurada. */
  urlLocal?: string | null;
  /** URL cloud configurada. */
  urlCloud?: string | null;
  /** Valor de EXPO_PUBLIC_API_URL. */
  variable?: string | null;
  /** `host:puerto` del servidor de desarrollo (Constants.expoConfig.hostUri). */
  hostUri?: string | null;
  /** Plataforma de React Native ('android', 'ios', 'web'). */
  plataforma: string;
}

/** Los túneles de Expo (exp.direct, ngrok) no son la PC: no sirven para llegar al backend. */
const ES_TUNEL = /(?:^|\.)(?:exp\.direct|ngrok[\w-]*\.\w+|loca\.lt|trycloudflare\.com)$/i;

export function resolverBaseUrl({ usarLocal, urlLocal, urlCloud, variable, hostUri, plataforma }: EntornoUrl): string {
  const local = limpiarUrl(urlLocal ?? LOCAL_POR_DEFECTO);
  const cloud = limpiarUrl(urlCloud ?? CLOUD_POR_DEFECTO);
  const modoLocal = (usarLocal ?? '').trim().toLowerCase() === 'true';

  if (usarLocal !== undefined || urlLocal !== undefined || urlCloud !== undefined) {
    return modoLocal ? local : cloud;
  }

  const explicita = limpiarUrl(variable);
  if (explicita) return explicita;

  if (plataforma !== 'web' && hostUri) {
    const host = hostUri.trim().replace(/^[a-z]+:\/\//i, '').split('/')[0].split(':')[0];
    if (host && !ES_TUNEL.test(host)) return `http://${host}:${PUERTO_BACKEND}`;
  }
  return LOCAL_POR_DEFECTO;
}

function limpiarUrl(url: string | null | undefined): string {
  return (url ?? '').trim().replace(/\/+$/, '');
}

/** `192.168.X.X:8000` para mostrar en mensajes: nunca incluye credenciales ni ruta. */
export function describirServidor(baseUrl: string): string {
  return baseUrl.replace(/^[a-z]+:\/\//i, '').split('/')[0];
}
