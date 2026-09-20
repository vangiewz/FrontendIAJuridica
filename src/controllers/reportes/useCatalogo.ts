import { useEffect, useState } from 'react';
import { Catalogo } from '../../models/reportes';
import { obtenerCatalogo } from '../../services/reportes';

/**
 * El catalogo de reportes, una sola vez por pantalla. De aca salen las entidades, los
 * campos y lo que se puede hacer con cada uno: si manana el backend agrega un campo,
 * el constructor lo muestra sin tocar el frontend.
 */
export function useCatalogo() {
  const [catalogo, setCatalogo] = useState<Catalogo | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let vigente = true;
    obtenerCatalogo()
      .then((valor) => {
        if (vigente) setCatalogo(valor);
      })
      .catch((e: any) => {
        if (vigente) setError(e?.mensaje || 'No se pudo cargar el catálogo de reportes');
      });
    return () => {
      vigente = false;
    };
  }, []);

  return { catalogo, error };
}
