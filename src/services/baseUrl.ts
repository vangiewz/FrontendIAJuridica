import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { describirServidor, resolverBaseUrl } from './resolverBaseUrl';

/**
 * Se calcula una vez al arrancar. `process.env.EXPO_PUBLIC_API_URL` tiene que escribirse
 * literal: Expo lo reemplaza en tiempo de empaquetado y no funciona con acceso dinámico.
 */
export const BASE_URL = resolverBaseUrl({
  usarLocal: process.env.EXPO_PUBLIC_USE_LOCAL_API,
  urlLocal: process.env.EXPO_PUBLIC_API_URL_LOCAL,
  urlCloud: process.env.EXPO_PUBLIC_API_URL_CLOUD,
  variable: process.env.EXPO_PUBLIC_API_URL,
  hostUri: Constants.expoConfig?.hostUri,
  plataforma: Platform.OS,
});

export const SERVIDOR = describirServidor(BASE_URL);

if (__DEV__) {
  const modo = (process.env.EXPO_PUBLIC_USE_LOCAL_API ?? '').trim().toLowerCase() === 'true'
    ? 'LOCAL'
    : 'CLOUD';
  console.log(`[API] mode=${modo}`);
  console.log(`[API] base=${BASE_URL}`);
}
