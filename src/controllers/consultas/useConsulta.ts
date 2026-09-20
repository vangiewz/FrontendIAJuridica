import { useEffect, useRef, useState } from 'react';
import { Consulta } from '../../models/consultas';
import { iniciarConsulta, obtenerConsulta } from '../../services/consultas';

const INTERVALO_MS = 2000;
const ETAPA_INICIAL = 'Preparando consulta...';

export function useConsulta() {
  const [consulta, setConsulta] = useState<Consulta | null>(null);
  const [cargando, setCargando] = useState(false);
  const [etapa, setEtapa] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const seguimiento = useRef<ReturnType<typeof setTimeout> | null>(null);
  const solicitud = useRef(0);

  const detener = () => {
    solicitud.current += 1;
    if (seguimiento.current) {
      clearTimeout(seguimiento.current);
      seguimiento.current = null;
    }
  };

  // Un desmontaje a mitad del analisis no debe dejar el intervalo corriendo.
  useEffect(() => detener, []);

  const crear = async (texto: string): Promise<string | null> => {
    setCargando(true);
    setError(null);
    setEtapa(ETAPA_INICIAL);
    try {
      return await iniciarConsulta(texto);
    } catch (e: any) {
      setError(e.mensaje || 'Error al crear la consulta');
      return null;
    } finally {
      setCargando(false);
    }
  };

  const leer = async (id: string, actual: number): Promise<Consulta | null> => {
    try {
      const data = await obtenerConsulta(id);
      if (actual !== solicitud.current) return null;
      setConsulta(data);
      setEtapa(data.etapa_ia);
      return data;
    } catch (e: any) {
      if (actual !== solicitud.current) return null;
      setError(e.mensaje || 'Error al cargar la consulta');
      return null;
    }
  };

  /**
   * Lee la consulta y, mientras el backend siga procesando, vuelve a preguntar para
   * mostrar en que etapa va. Se detiene sola al completarse o fallar.
   */
  const cargar = async (id: string): Promise<void> => {
    setCargando(true);
    setError(null);
    detener();
    setConsulta(null);
    setEtapa(ETAPA_INICIAL);
    const actualSolicitud = solicitud.current;
    const inicial = await leer(id, actualSolicitud);
    if (actualSolicitud !== solicitud.current) return;
    if (!inicial || inicial.estado !== 'procesando') {
      setCargando(false);
      return;
    }
    const continuar = async () => {
      const actual = await leer(id, actualSolicitud);
      if (actualSolicitud !== solicitud.current) return;
      if (!actual || actual.estado !== 'procesando') {
        detener();
        setCargando(false);
      } else {
        // Esperar la respuesta anterior evita solicitudes superpuestas a una API lenta.
        seguimiento.current = setTimeout(continuar, INTERVALO_MS);
      }
    };
    seguimiento.current = setTimeout(continuar, INTERVALO_MS);
  };

  return { consulta, cargando, etapa, error, crear, cargar };
}
