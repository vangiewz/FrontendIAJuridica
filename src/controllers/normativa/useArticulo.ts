import { useQuery } from '@tanstack/react-query';
import { obtenerArticulo } from '../../services/normativa';
import { claves } from '../../services/persistencia/claves';
import { esErrorDeTransporte } from '../../services/api';
import { repositorio } from '../../services/corpus/repositorio';
import { armarDetalleLocal } from '../../models/normativa/corpus';

export function useArticulo(codigo: string, numero: number) {
  const numeroValido = !isNaN(numero);

  const { data, isLoading, error } = useQuery({
    queryKey: numeroValido ? claves.articulo(codigo, numero) : claves.articulo(codigo, 0),
    queryFn: async () => {
      try {
        return await obtenerArticulo(codigo, numero);
      } catch (err) {
        if (esErrorDeTransporte(err)) {
          const completo = await repositorio.estaCompleto(codigo);
          if (completo) {
            const local = await repositorio.leerArticulo(codigo, numero);
            if (local) {
              const { anterior, siguiente } = await repositorio.vecinos(codigo, numero);
              return armarDetalleLocal(local, anterior, siguiente);
            }
          }
        }
        throw err;
      }
    },
    enabled: numeroValido,
    staleTime: Infinity,
  });

  const articulo = data || null;
  let mensajeError: string | null = null;

  if (!numeroValido) {
    mensajeError = 'Ese artículo no está en el corpus cargado';
  } else if (error) {
    if (!esErrorDeTransporte(error) || !articulo) {
      mensajeError = (error as any).mensaje || 'Error al cargar el artículo';
    }
  }

  const cargando = numeroValido ? isLoading : false;

  return { articulo, cargando, error: mensajeError };
}
