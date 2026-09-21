import { useQuery } from '@tanstack/react-query';
import { claves } from '../../services/persistencia/claves';
import { listarHistorial } from '../../services/consultas';
import { esErrorDeTransporte } from '../../services/api';
import { usePendientes } from '../sync/usePendientes';
import { ItemHistorialLocal } from '../../models/shared/sincronizacion';

export function useHistorial() {
  const { pendientes } = usePendientes();
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: claves.historial(),
    queryFn: listarHistorial,
  });

  const historialRemoto = data || [];
  
  const pendientesHistorial: ItemHistorialLocal[] = pendientes
    .filter(p => p.tipo === 'consulta.iniciar')
    .map(p => {
      const payload = p.payload as { texto: string };
      return {
        id: p.id,
        texto: payload.texto,
        area_juridica: null,
        cantidad_fuentes: 0,
        documento_nombre: null,
        creada_en: p.creadaEn,
        pendiente: {
          estado: p.estado,
          intentos: p.intentos,
          mensaje: p.ultimoError,
        }
      };
    });

  const historialFusionado: ItemHistorialLocal[] = [...pendientesHistorial, ...historialRemoto].sort(
    (a, b) => new Date(b.creada_en).getTime() - new Date(a.creada_en).getTime()
  );
  
  let mensajeError: string | null = null;
  if (error) {
    if (!esErrorDeTransporte(error) || historialFusionado.length === 0) {
      mensajeError = (error as any).mensaje || 'Error al cargar el historial';
    }
  }

  return {
    historial: historialFusionado,
    cargando: isLoading,
    error: mensajeError,
    cargar: async () => { await refetch(); }
  };
}
