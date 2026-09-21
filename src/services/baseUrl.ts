import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { describirServidor, resolverBaseUrl } from './resolverBaseUrl';

/**
 * Se calcula una vez al arrancar. `process.env.EXPO_PUBLIC_API_URL` tiene que escribirse
 * literal: Expo lo reemplaza en tiempo de empaquetado y no funciona con acceso dinámico.
 */
export const BASE_URL = resolverBaseUrl({
  variable: process.env.EXPO_PUBLIC_API_URL,
  hostUri: Constants.expoConfig?.hostUri,
  plataforma: Platform.OS,
});

export const SERVIDOR = describirServidor(BASE_URL);
