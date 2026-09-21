import { useQuery } from '@tanstack/react-query';
import { obtenerArticulo } from '../../services/normativa';
import { claves } from '../../services/persistencia/claves';
import { esErrorDeTransporte } from '../../services/api';

export function useArticulo(codigo: string, numero: number) {
  const numeroValido = !isNaN(numero);

  const { data, isLoading, error } = useQuery({
    queryKey: numeroValido ? claves.articulo(codigo, numero) : claves.articulo(codigo, 0),
    queryFn: () => obtenerArticulo(codigo, numero),
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
