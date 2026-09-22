let cacheIntercambios: Intercambio[] = [];

import { useCallback, useEffect, useRef, useState } from 'react';
import { Consulta } from '../../models/consultas';
import { ItemDocumento } from '../../models/documentos';
import { TemaAyuda } from '../../config/capacidadesAsistente';
import { obtenerConsulta } from '../../services/consultas';
import { encolar, esperarResultado, suscribirResultado } from '../../services/sync/cola';
import { randomUUID } from 'expo-crypto';

const INTERVALO_MS = 2000;
/**
 * Cuántas lecturas de avance seguidas pueden fallar por la red antes de darse por
 * vencido. Con espera creciente son unos 40-60 s: un cambio de antena o un microcorte de
 * la wifi no debe tirar una consulta que el servidor sigue procesando.
 */
const MAX_FALLOS_SEGUIDOS = 8;
const ESPERA_MAXIMA_MS = 8000;

export interface Intercambio {
  id: string;
  pregunta: string;
  /** El documento que estaba activo cuando se preguntó, para mostrarlo en el hilo. */
  documentoNombre: string | null;
  consulta: Consulta | null;
  /** Id de la consulta en el servidor; con él se puede retomar el seguimiento. */
  consultaId: string | null;
  etapa: string | null;
  error: string | null;
  /** Se perdió el contacto con el servidor pero se sigue intentando. */
  reconectando: boolean;
  /** Momento (Date.now) en que se envió; sirve para el reloj de espera. */
  iniciadoEn: number;
  duracionMs: number | null;
  /** Quedo en la cola de salida: se envia sola cuando vuelva la conexion. */
  encolado?: boolean;
  /**
   * Es una respuesta LOCAL de ayuda («¿qué podés hacer?»): no hubo consulta ni servidor. El valor es el tema
   * de ayuda; el hilo la dibuja con el catálogo de capacidades.
   */
  ayuda?: TemaAyuda;
}

const PERDIDA_DE_CONEXION =
  'Perdí la conexión con el servidor mientras esperaba la respuesta. Tu consulta puede haberse completado: revísala en Historial o vuelve a intentar la conexión.';

/** Del documento activo solo hacen falta el id (viaja al backend) y el nombre (se muestra). */
export type DocumentoActivo = Pick<ItemDocumento, 'id' | 'nombre_archivo'>;

const esErrorDeRed = (e: any) =>
  e?.codigo === 'SIN_CONEXION' || e?.codigo === 'TIEMPO_AGOTADO' ||
  (typeof e?.estado === 'number' && e.estado >= 502 && e.estado <= 504);

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
export function useAsistente(documentoInicial: DocumentoActivo | null = null) {
  const [documento, setDocumento] = useState<DocumentoActivo | null>(documentoInicial);
  const [intercambios, setIntercambiosState] = useState<Intercambio[]>(cacheIntercambios);
  const setIntercambios = useCallback((accion: React.SetStateAction<Intercambio[]>) => {
    setIntercambiosState((prev) => {
      const nuevo = typeof accion === 'function' ? (accion as (prev: Intercambio[]) => Intercambio[])(prev) : accion;
      cacheIntercambios = nuevo;
      return nuevo;
    });
  }, []);
  const [enviando, setEnviando] = useState(false);
  const seguimiento = useRef<ReturnType<typeof setTimeout> | null>(null);
  const vigente = useRef(0);
  const ocupado = useRef(false);
  const actuales = useRef<Intercambio[]>([]);
  actuales.current = intercambios;
  const suscripcionesCola = useRef<Set<() => void>>(new Set());

  const detener = useCallback(() => {
    vigente.current += 1;
    if (seguimiento.current) {
      clearTimeout(seguimiento.current);
      seguimiento.current = null;
    }
  }, []);

  /**
   * Deja de esperar a la cola. NO va dentro de `detener`: ese corre al mandar cada consulta
   * nueva, y cada mensaje encolado tiene su propia espera. Si se dieran de baja ahi, mandar
   * un segundo mensaje sin conexion dejaria al primero con el sello de pendiente para
   * siempre, aunque despues se enviara bien.
   */
  const olvidarPendientes = useCallback(() => {
    suscripcionesCola.current.forEach((darDeBaja) => darDeBaja());
    suscripcionesCola.current.clear();
  }, []);

  // Al salir de la pantalla se cancela el sondeo activo para no gastar bateria en segundo plano.
  // Pero NO se dan de baja las suscripciones de la cola: si el usuario vuelve tras reconectar
  // el WiFi, la respuesta debe destaparse y mostrarse normalmente.
  useEffect(() => () => {
    detener();
  }, [detener]);

  const actualizar = useCallback((id: string, cambio: Partial<Intercambio>) => {
    setIntercambios((previos) =>
      previos.map((i) => (i.id === id ? { ...i, ...cambio } : i)),
    );
  }, []);

  /** Sigue el avance de una consulta hasta que el backend la da por terminada. */
  const seguir = useCallback(
    (id: string, localId: string, turno: number, inicio: number) => {
      let fallos = 0;
      const paso = async () => {
        try {
          const consulta = await obtenerConsulta(id);
          if (turno !== vigente.current) return;
          fallos = 0;
          actualizar(localId, {
            consulta, reconectando: false,
            // La etapa es la que informa el servidor; si aún no informó ninguna se
            // conserva la anterior en vez de borrarla.
            ...(consulta.etapa_ia ? { etapa: consulta.etapa_ia } : {}),
            duracionMs: consulta.estado === 'procesando' ? null : Date.now() - inicio,
          });
          if (consulta.estado === 'procesando') {
            // Esperar la respuesta anterior evita pedidos superpuestos a una API lenta.
            seguimiento.current = setTimeout(paso, INTERVALO_MS);
          } else {
            ocupado.current = false;
            setEnviando(false);
          }
        } catch (e: any) {
          if (turno !== vigente.current) return;
          if (esErrorDeRed(e) && ++fallos < MAX_FALLOS_SEGUIDOS) {
            actualizar(localId, { reconectando: true });
            seguimiento.current = setTimeout(
              paso, Math.min(INTERVALO_MS * (fallos + 1), ESPERA_MAXIMA_MS));
            return;
          }
          actualizar(localId, {
            error: esErrorDeRed(e) ? PERDIDA_DE_CONEXION : (e?.mensaje || 'No se pudo leer la respuesta'),
            reconectando: false,
          });
          ocupado.current = false;
          setEnviando(false);
        }
      };
      void paso();
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
      const inicio = Date.now();
      const localId = `local-${inicio}-${turno}`;
      setIntercambios((previos) => [...previos, {
        id: localId, pregunta: limpio, documentoNombre: documento?.nombre_archivo ?? null,
        consulta: null, consultaId: null, etapa: 'Enviando tu consulta...', error: null,
        reconectando: false, iniciadoEn: inicio, duracionMs: null,
      }]);

      let id: string | null = null;
      let opId: string | null = null;
      try {
        const payload = { texto: limpio, documento_id: documento?.id ?? null, client_op_id: randomUUID() };
        const op = await encolar('consulta.iniciar', payload);
        opId = op.id;
        id = await esperarResultado(op.id, 4000);
      } catch (e: any) {
        actualizar(localId, { error: e?.mensaje || 'No se pudo enviar la consulta' });
        ocupado.current = false;
        setEnviando(false);
        return true;
      }

      if (!id) {
        if (opId) {
          actualizar(localId, { encolado: true, etapa: null });
          ocupado.current = false;
          setEnviando(false);
          
          let desuscribir = () => {};
          desuscribir = suscribirResultado(opId, (idReal: string) => {
            suscripcionesCola.current.delete(desuscribir);
            const i = actuales.current.find(ex => ex.id === localId);
            if (i && !i.error) {
              actualizar(localId, { encolado: false, consultaId: idReal, etapa: 'Analizando tu consulta...' });
              ocupado.current = true;
              setEnviando(true);
              const turnoActual = vigente.current;
              seguir(idReal, localId, turnoActual, inicio);
            }
          });
          suscripcionesCola.current.add(desuscribir);
        }
        return true;
      }

      actualizar(localId, { consultaId: id, etapa: 'Analizando tu consulta...' });
      seguir(id, localId, turno, inicio);
      return true;
    },
    [documento, detener, seguir, actualizar],
  );

  /**
   * Reintenta un intercambio fallido. Si el servidor ya tenía la consulta, se retoma su
   * seguimiento —no se vuelve a ejecutar el modelo—; si nunca llegó a aceptarla, se
   * envía de nuevo la misma pregunta.
   */
  const reintentar = useCallback((localId: string) => {
    const fallido = actuales.current.find((i) => i.id === localId);
    if (!fallido || ocupado.current) return;
    if (fallido.consultaId) {
      ocupado.current = true;
      setEnviando(true);
      detener();
      actualizar(localId, { error: null, reconectando: true });
      seguir(fallido.consultaId, localId, vigente.current, fallido.iniciadoEn);
      return;
    }
    setIntercambios((previos) => previos.filter((i) => i.id !== localId));
    void preguntar(fallido.pregunta);
  }, [detener, seguir, actualizar, preguntar]);

  /**
   * Agrega al hilo una respuesta de ayuda sobre la propia app. No pasa por `preguntar`: no consulta al
   * asistente jurídico, no usa el servidor y no queda «enviando».
   */
  const responderAyuda = useCallback((pregunta: string, tema: TemaAyuda) => {
    const ahora = Date.now();
    setIntercambios((previos) => [...previos, {
      id: `ayuda-${ahora}-${previos.length}`, pregunta: pregunta.trim(), documentoNombre: documento?.nombre_archivo ?? null,
      consulta: null, consultaId: null, etapa: null, error: null, reconectando: false, iniciadoEn: ahora,
      duracionMs: 0, ayuda: tema,
    }]);
  }, [documento]);

  /** Cambiar de documento no borra lo ya conversado; solo cambia el contexto siguiente. */
  const elegirDocumento = useCallback((nuevo: DocumentoActivo | null) => {
    setDocumento(nuevo);
  }, []);

  const limpiarConversacion = useCallback(() => {
    detener();
    // Se borra el hilo entero, asi que ya no hay mensaje que destapar cuando la cola salga.
    // La consulta igual se envia y queda en el historial.
    olvidarPendientes();
    cacheIntercambios = [];
    setIntercambios([]);
    ocupado.current = false;
    setEnviando(false);
  }, [detener, olvidarPendientes]);

  return {
    documento, elegirDocumento,
    intercambios, enviando, preguntar, responderAyuda, reintentar, limpiarConversacion, detener,
  };
}
