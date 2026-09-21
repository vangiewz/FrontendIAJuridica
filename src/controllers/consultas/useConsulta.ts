import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Consulta } from '../../models/consultas';
import { iniciarConsulta, obtenerConsulta } from '../../services/consultas';
import { claves } from '../../services/persistencia/claves';
import { esErrorDeTransporte } from '../../services/api';

const INTERVALO_MS = 2000;
const ETAPA_INICIAL = 'Preparando consulta...';

export function useConsulta() {
  const [consultaId, setConsultaId] = useState<string | null>(null);
  const [cargandoCreacion, setCargandoCreacion] = useState(false);
  const [errorCreacion, setErrorCreacion] = useState<string | null>(null);
  const [etapaCreacion, setEtapaCreacion] = useState<string | null>(null);
  const { data, isLoading: cargandoQuery, error: errorQuery } = useQuery({
    queryKey: consultaId ? claves.consulta(consultaId) : claves.consulta(''),
    queryFn: () => obtenerConsulta(consultaId!),
    enabled: !!consultaId,
    refetchInterval: (q) => (q.state.data as Consulta)?.estado === 'procesando' ? INTERVALO_MS : false,
  });
  const crear = async (texto: string) => {
    setCargandoCreacion(true); setErrorCreacion(null); setEtapaCreacion(ETAPA_INICIAL);
    try {
      const nuevoId = await iniciarConsulta(texto);
      setConsultaId(nuevoId);
      return nuevoId;
    } catch (e: any) {
      setErrorCreacion(e.mensaje || 'Error al crear la consulta');
      return null;
    } finally {
      setCargandoCreacion(false); setEtapaCreacion(null);
    }
  };
  const cargar = async (id: string) => {
    setConsultaId(id); setErrorCreacion(null); setEtapaCreacion(null);
  };
  const consulta = data || null;
  const cargando = cargandoCreacion || (!!consultaId && cargandoQuery);
  const etapa = etapaCreacion || consulta?.etapa_ia || (consultaId && cargandoQuery ? ETAPA_INICIAL : null);
  let error = errorCreacion;
  if (!error && errorQuery && (!esErrorDeTransporte(errorQuery) || !consulta)) error = (errorQuery as any).mensaje || 'Error al cargar la consulta';
  return { consulta, cargando, etapa, error, crear, cargar };
}
