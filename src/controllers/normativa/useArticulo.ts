import { useState, useEffect } from 'react';
import { ArticuloDetalle } from '../../models/normativa';
import { obtenerArticulo } from '../../services/normativa';

export function useArticulo(codigo: string, numero: number) {
  const [articulo, setArticulo] = useState<ArticuloDetalle | null>(null);
  const [cargando, setCargando] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let montado = true;
    setCargando(true);
    setError(null);

    if (isNaN(numero)) {
      setError('Ese artículo no está en el corpus cargado');
      setCargando(false);
      return;
    }

    obtenerArticulo(codigo, numero)
      .then((data) => {
        if (montado) {
          setArticulo(data);
          setCargando(false);
        }
      })
      .catch((err) => {
        if (montado) {
          setArticulo(null);
          setError(err.mensaje || 'Error al cargar el artículo');
          setCargando(false);
        }
      });

    return () => {
      montado = false;
    };
  }, [codigo, numero]);

  return { articulo, cargando, error };
}
