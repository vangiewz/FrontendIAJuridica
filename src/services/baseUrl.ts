import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { describirServidor, resolverBaseUrl } from './resolverBaseUrl';

/**
 * Se calcula una vez al arrancar. `process.env.EXPO_PUBLIC_API_URL` tiene que escribirse
 * literal: Expo lo reemplaza al empaquetar y no funciona con acceso dinámico.
 */
export const BASE_URL = resolverBaseUrl({
  variable: process.env.EXPO_PUBLIC_API_URL,
  hostUri: Constants.expoConfig?.hostUri,
  plataforma: Platform.OS,
});

export const SERVIDOR = describirServidor(BASE_URL);

if (__DEV__) {
  const origen = process.env.EXPO_PUBLIC_API_URL ? '.env' : 'host de Metro';
  console.log(`[API] base=${BASE_URL} (${origen})`);
}
