import { useEffect, useState } from 'react';
import { Comparacion } from '../../models/documentos';
import { obtenerComparacion } from '../../services/documentos';
import { mensajeDeErrorHistorial } from './useHistorialDocumentos';

/** Relee una comparación guardada. No vuelve a ejecutar la comparación. */
export function useComparacionGuardada(comparacionId: string) {
  const [comparacion, setComparacion] = useState<Comparacion | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let vigente = true;

    const cargar = async () => {
      setCargando(true);
      setError(null);
      try {
        const guardada = await obtenerComparacion(comparacionId);
        if (vigente) setComparacion(guardada);
      } catch (e) {
        if (vigente) setError(mensajeDeErrorHistorial(e));
      } finally {
        if (vigente) setCargando(false);
      }
    };

    if (comparacionId) cargar();
    return () => {
      vigente = false;
    };
  }, [comparacionId]);

  return { comparacion, cargando, error };
}
