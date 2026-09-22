import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { verificarServidor } from '../../services/servidor';

export type EstadoConexion = 'desconocido' | 'en-linea' | 'sin-red' | 'servidor-caido';

export function useConexion(): {
  estado: EstadoConexion;
  comprobando: boolean;
  comprobar: () => Promise<boolean>;
} {
  const [estado, setEstado] = useState<EstadoConexion>('desconocido');
  const [comprobando, setComprobando] = useState(false);

  const comprobar = useCallback(async () => {
    setComprobando(true);
    const red = await NetInfo.fetch();
    if (red.isConnected === false) {
      setEstado('sin-red');
      setComprobando(false);
      return false;
    }
    
    const ok = await verificarServidor();
    setEstado(ok ? 'en-linea' : 'servidor-caido');
    setComprobando(false);
    return ok;
  }, []);

  useEffect(() => {
    void comprobar();
    
    const oyenteApp = AppState.addEventListener('change', (siguiente) => {
      if (siguiente === 'active') void comprobar();
    });

    const oyenteNet = NetInfo.addEventListener((estadoRed) => {
      if (estadoRed.isConnected) {
        void comprobar();
      } else if (estadoRed.isConnected === false) {
        setEstado('sin-red');
      }
    });

    return () => {
      oyenteApp.remove();
      oyenteNet();
    };
  }, [comprobar]);

  return { estado, comprobando, comprobar };
}

