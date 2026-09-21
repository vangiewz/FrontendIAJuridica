import { useSyncExternalStore } from 'react';
import { obtenerEstadoLectura, suscribirLectura } from '../../services/voz/lectura';

/**
 * ¿Se está leyendo alguna respuesta en voz alta? Solo LEE el estado del motor de lectura
 * existente (no lo controla): sirve para que el avatar mueva la boca mientras suena.
 */
export function useHablando(): boolean {
  return useSyncExternalStore(suscribirLectura, () => obtenerEstadoLectura().id !== null);
}
