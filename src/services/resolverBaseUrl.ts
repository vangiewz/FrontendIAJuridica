/**
 * Decide a qué servidor le habla la app. Función pura: no importa nada de React Native,
 * así que se puede probar sola y no depende de la plataforma.
 *
 * Orden de prioridad:
 *  1. EXPO_PUBLIC_API_URL, si está definida. Es la forma explícita: `.env` o la línea de
 *     comandos, sin tocar código (p. ej. http://192.168.X.X:8000).
 *  2. En un celular o emulador con el servidor de desarrollo de Expo, el host desde el
 *     que se cargó la app. Metro corre en la misma PC que el backend, así que su IP de
 *     red local es también la del backend. Sirve sin configurar nada.
 *  3. http://localhost:8000: la web y un navegador en la misma PC.
 *
 * `localhost` dentro de un celular apunta al propio celular, no a la PC: por eso la
 * opción 2 existe.
 */
export const PUERTO_BACKEND = 8000;
const RESPALDO = `http://localhost:${PUERTO_BACKEND}`;

export interface EntornoUrl {
  /** Valor de EXPO_PUBLIC_API_URL. */
  variable?: string | null;
  /** `host:puerto` del servidor de desarrollo (Constants.expoConfig.hostUri). */
  hostUri?: string | null;
  /** Plataforma de React Native ('android', 'ios', 'web'). */
  plataforma: string;
}

/** Los túneles de Expo (exp.direct, ngrok) no son la PC: no sirven para llegar al backend. */
const ES_TUNEL = /(?:^|\.)(?:exp\.direct|ngrok[\w-]*\.\w+|loca\.lt|trycloudflare\.com)$/i;

export function resolverBaseUrl({ variable, hostUri, plataforma }: EntornoUrl): string {
  const explicita = (variable ?? '').trim().replace(/\/+$/, '');
  if (explicita) return explicita;

  if (plataforma !== 'web' && hostUri) {
    const host = hostUri.trim().replace(/^[a-z]+:\/\//i, '').split('/')[0].split(':')[0];
    if (host && !ES_TUNEL.test(host)) return `http://${host}:${PUERTO_BACKEND}`;
  }
  return RESPALDO;
}

/** `192.168.X.X:8000` para mostrar en mensajes: nunca incluye credenciales ni ruta. */
export function describirServidor(baseUrl: string): string {
  return baseUrl.replace(/^[a-z]+:\/\//i, '').split('/')[0];
}
