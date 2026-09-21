import { useCallback, useSyncExternalStore } from 'react';
import {
  detener, leer, obtenerEstadoLectura, suscribirLectura,
} from '../../services/voz/lectura';

/** Estado de la lectura en voz alta de UNA respuesta (la identificada por `id`). */
export function useLectura(id: string, texto: string) {
  const estado = useSyncExternalStore(suscribirLectura, obtenerEstadoLectura);
  const leyendo = estado.id === id;

  const alternar = useCallback(() => {
    if (leyendo) detener();
    else void leer(id, texto);
  }, [leyendo, id, texto]);

  return { leyendo, error: estado.idError === id ? estado.error : null, alternar };
}
