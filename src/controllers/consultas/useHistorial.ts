import { useQuery } from '@tanstack/react-query';
import { claves } from '../../services/persistencia/claves';
import { listarHistorial } from '../../services/consultas';
import { esErrorDeTransporte } from '../../services/api';

export function useHistorial() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: claves.historial(),
    queryFn: listarHistorial,
  });

  const historial = data || [];
  
  let mensajeError: string | null = null;
  if (error) {
    if (!esErrorDeTransporte(error) || historial.length === 0) {
      mensajeError = (error as any).mensaje || 'Error al cargar el historial';
    }
  }

  return {
    historial,
    cargando: isLoading,
    error: mensajeError,
    cargar: async () => { await refetch(); }
  };
}
