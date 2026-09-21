import { useState, useEffect } from 'react';
import { registrarServiceWorker, aplicarActualizacion } from '../../services/pwa/registrar';

export function useActualizacion(): { hayActualizacion: boolean; aplicar: () => void } {
  const [hayActualizacion, setHayActualizacion] = useState(false);

  useEffect(() => {
    void registrarServiceWorker(() => setHayActualizacion(true));
  }, []);

  return {
    hayActualizacion,
    aplicar: () => aplicarActualizacion(),
  };
}

