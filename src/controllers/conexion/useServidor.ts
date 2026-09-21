import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { verificarServidor } from '../../services/servidor';

export type EstadoServidor = 'desconocido' | 'ok' | 'caido';

/**
 * ¿Se llega al backend desde este dispositivo? Se comprueba al abrir la pantalla y cada
 * vez que la app vuelve al primer plano (p. ej. tras cambiar de wifi). No consulta en
 * bucle ni gasta batería: `comprobar` se llama a mano cuando hace falta.
 */
export function useServidor() {
  const [estado, setEstado] = useState<EstadoServidor>('desconocido');
  const [comprobando, setComprobando] = useState(false);

  const comprobar = useCallback(async () => {
    setComprobando(true);
    const ok = await verificarServidor();
    setEstado(ok ? 'ok' : 'caido');
    setComprobando(false);
    return ok;
  }, []);

  useEffect(() => {
    void comprobar();
    const oyente = AppState.addEventListener('change', (siguiente) => {
      if (siguiente === 'active') void comprobar();
    });
    return () => oyente.remove();
  }, [comprobar]);

  return { estado, comprobando, comprobar };
}
