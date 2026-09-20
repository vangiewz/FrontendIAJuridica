import { useCallback, useRef, useState } from 'react';
import { Consulta } from '../../models/consultas';
import { ItemDocumento } from '../../models/documentos';
import { iniciarConsulta, obtenerConsulta } from '../../services/consultas';

const INTERVALO_MS = 2000;

export interface Intercambio {
  id: string;
  pregunta: string;
  /** El documento que estaba activo cuando se preguntó, para mostrarlo en el hilo. */
  documentoNombre: string | null;
  consulta: Consulta | null;
  etapa: string | null;
  error: string | null;
  duracionMs: number | null;
}

/**
 * La conversacion del asistente: el documento activo y los intercambios ya hechos.
 *
 * El documento vive aca y no en cada mensaje: una vez elegido acompaña a todas las
 * preguntas siguientes hasta que se lo quita o se lo cambia, que es lo que permite
 * preguntar "¿y cuando empieza?" sin volver a adjuntar nada.
 *
 * Reutiliza el mecanismo asincrono existente (iniciar + consultar el avance): el modelo
 * local tarda, y asi la pantalla puede decir en que etapa va.
 */
export function useAsistente() {
  const [documento, setDocumento] = useState<ItemDocumento | null>(null);
  const [intercambios, setIntercambios] = useState<Intercambio[]>([]);
  const [enviando, setEnviando] = useState(false);
  const seguimiento = useRef<ReturnType<typeof setTimeout> | null>(null);
  const vigente = useRef(0);
  const ocupado = useRef(false);

  const detener = useCallback(() => {
    vigente.current += 1;
    if (seguimiento.current) {
      clearTimeout(seguimiento.current);
      seguimiento.current = null;
    }
  }, []);

  const actualizar = useCallback((id: string, cambio: Partial<Intercambio>) => {
    setIntercambios((previos) =>
      previos.map((i) => (i.id === id ? { ...i, ...cambio } : i)),
    );
  }, []);

  /** Sigue el avance de una consulta hasta que el backend la da por terminada. */
  const seguir = useCallback(
    (id: string, localId: string, turno: number, inicio: number) => {
      const paso = async () => {
        try {
          const consulta = await obtenerConsulta(id);
          if (turno !== vigente.current) return;
          actualizar(localId, { consulta, etapa: consulta.etapa_ia,
            duracionMs: consulta.estado === 'procesando' ? null : performance.now() - inicio });
          if (consulta.estado === 'procesando') {
            // Esperar la respuesta anterior evita pedidos superpuestos a una API lenta.
            seguimiento.current = setTimeout(paso, INTERVALO_MS);
          } else {
            ocupado.current = false;
            setEnviando(false);
          }
        } catch (e: any) {
          if (turno !== vigente.current) return;
          actualizar(localId, { error: e?.mensaje || 'No se pudo leer la respuesta' });
          ocupado.current = false;
          setEnviando(false);
        }
      };
      seguimiento.current = setTimeout(paso, INTERVALO_MS);
    },
    [actualizar],
  );

  const preguntar = useCallback(
    async (texto: string): Promise<boolean> => {
      const limpio = texto.trim();
      if (limpio.length < 3 || ocupado.current) return false;
      ocupado.current = true;
      setEnviando(true);
      detener();
      const turno = vigente.current;
      const inicio = performance.now();
      const localId = `local-${Date.now()}-${turno}`;
      setIntercambios((previos) => [...previos, {
        id: localId, pregunta: limpio, documentoNombre: documento?.nombre_archivo ?? null,
        consulta: null, etapa: 'Pensando...', error: null, duracionMs: null,
      }]);

      let id: string;
      try {
        id = await iniciarConsulta(limpio, documento?.id ?? null);
      } catch (e: any) {
        // Sin id no hay hilo que seguir: el error se muestra como un intercambio fallido.
        actualizar(localId, { error: e?.mensaje || 'No se pudo enviar la consulta' });
        ocupado.current = false;
        setEnviando(false);
        return true;
      }

      seguir(id, localId, turno, inicio);
      return true;
    },
    [documento, detener, seguir, actualizar],
  );

  /** Cambiar de documento no borra lo ya conversado; solo cambia el contexto siguiente. */
  const elegirDocumento = useCallback((nuevo: ItemDocumento | null) => {
    setDocumento(nuevo);
  }, []);

  const limpiarConversacion = useCallback(() => {
    detener();
    setIntercambios([]);
    ocupado.current = false;
    setEnviando(false);
  }, [detener]);

  return {
    documento, elegirDocumento,
    intercambios, enviando, preguntar, limpiarConversacion, detener,
  };
}
