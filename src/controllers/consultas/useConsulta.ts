import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Consulta } from '../../models/consultas';
import { obtenerConsulta } from '../../services/consultas';
import { claves } from '../../services/persistencia/claves';
import { esErrorDeTransporte } from '../../services/api';

const INTERVALO_MS = 2000;
const ETAPA_INICIAL = 'Preparando consulta...';

export function useConsulta() {
  const [consultaId, setConsultaId] = useState<string | null>(null);
  
  const { data, isLoading: cargandoQuery, error: errorQuery } = useQuery({
    queryKey: consultaId ? claves.consulta(consultaId) : claves.consulta(''),
    queryFn: () => obtenerConsulta(consultaId!),
    enabled: !!consultaId,
    refetchInterval: (q) => (q.state.data as Consulta)?.estado === 'procesando' ? INTERVALO_MS : false,
  });

  const cargar = async (id: string) => {
    setConsultaId(id);
  };

  const consulta = data || null;
  const cargando = (!!consultaId && cargandoQuery);
  const etapa = consulta?.etapa_ia || (consultaId && cargandoQuery ? ETAPA_INICIAL : null);
  
  let error = null;
  if (errorQuery && (!esErrorDeTransporte(errorQuery) || !consulta)) {
    error = (errorQuery as any).mensaje || 'Error al cargar la consulta';
  }

  return { consulta, cargando, etapa, error, cargar };
}
