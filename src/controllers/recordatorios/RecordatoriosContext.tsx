import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { esFutura, FechaSimple, HoraSimple, aClave, aClaveFecha, zonaHoraria } from '../../services/recordatorios/fechas';
import { Recurrencia, TipoRecordatorio } from '../../services/recordatorios/interpretar';
import {
  claveDeDuplicado, nuevoId, planReconciliar, RecordatorioJuridico,
} from '../../services/recordatorios/modelo';
import { guardarRecordatorios, leerRecordatorios } from '../../services/recordatorios/almacen';
import {
  alTocar, cancelarIds, configurarManejador, consultarPermiso, EstadoPermiso, idsProgramados, limpiarUltimoToque,
  NOTIFICACIONES_DISPONIBLES, pedirPermiso as pedirPermisoSistema, prepararCanal, programar as programarEnAndroid, rellenarMensual,
  ToqueDeNotificacion, ultimoToque,
} from '../../services/recordatorios/notificaciones';

/**
 * RECORDATORIOS JURÍDICOS de este teléfono, en la RAÍZ de la app (igual que los archivos
 * recibidos): por encima de la sesión y de las rutas. Una notificación tocada con la app cerrada
 * llega antes de que el usuario inicie sesión y no debe perderse; aquí se conserva hasta que la
 * llamada la muestre.
 *
 * Fuente de verdad: Android tiene el EVENTO programado; aquí vive la metadata (título, documento,
 * tipo…). Al arrancar y al volver a primer plano se RECONCILIA (`planReconciliar`).
 *
 * Nada crea un recordatorio por sí solo: `programar` solo se llama después de que el usuario
 * confirmó la fecha y la hora que se le mostraron.
 */

export interface NuevoRecordatorio {
  titulo: string;
  tipo: TipoRecordatorio;
  fecha: FechaSimple;
  hora: HoraSimple;
  repeticion?: Recurrencia;
  documentoId?: string;
  documentoNombre?: string;
  fechaReferencia?: FechaSimple | null;
}

interface Valor {
  /** Solo Android: en web y iOS no hay recordatorios locales. */
  disponible: boolean;
  cargando: boolean;
  recordatorios: RecordatorioJuridico[];
  /** Un toque de notificación esperando que la llamada lo muestre. */
  toque: ToqueDeNotificacion | null;
  comprobarPermiso: () => Promise<EstadoPermiso>;
  pedirPermiso: () => Promise<EstadoPermiso>;
  programar: (n: NuevoRecordatorio) => Promise<RecordatorioJuridico>;
  /** Cambia fecha y hora de uno existente: programa el nuevo ANTES de cancelar el anterior. */
  reemplazar: (id: string, n: NuevoRecordatorio) => Promise<RecordatorioJuridico>;
  cancelar: (id: string) => Promise<void>;
  consumirToque: (clave: string) => void;
}

const noDisponible = () => Promise.reject({ mensaje: 'Los recordatorios no están disponibles en esta versión de la app. Instala la versión más reciente en el celular.', codigo: 'NO_DISPONIBLE', estado: 0 });
const VACIO: Valor = {
  disponible: false, cargando: false, recordatorios: [], toque: null,
  comprobarPermiso: noDisponible, pedirPermiso: noDisponible, programar: noDisponible,
  reemplazar: noDisponible, cancelar: noDisponible, consumirToque: () => undefined,
};
const Contexto = createContext<Valor>(VACIO);
export const useRecordatorios = () => useContext(Contexto);

/** Lo que tarda Android en agendar: una hora que está por pasar en este instante ya no se programa. */
const MARGEN_MS = 5000;
const FECHA_PASADA = { mensaje: 'Esa fecha ya pasó. Elige una fecha futura.', codigo: 'FECHA_PASADA', estado: 0 };

export function RecordatoriosProvider({ children }: { children: React.ReactNode }) {
  return Platform.OS === 'android' && NOTIFICACIONES_DISPONIBLES
    ? <ProveedorAndroid>{children}</ProveedorAndroid>
    : <Contexto.Provider value={VACIO}>{children}</Contexto.Provider>;
}

function ProveedorAndroid({ children }: { children: React.ReactNode }) {
  const [recordatorios, setRecordatorios] = useState<RecordatorioJuridico[]>([]);
  const [cargando, setCargando] = useState(true);
  const [toque, setToque] = useState<ToqueDeNotificacion | null>(null);
  const ref = useRef<RecordatorioJuridico[]>([]);
  const cola = useRef<Promise<unknown>>(Promise.resolve());
  const vistos = useRef(new Set<string>());
  const cargado = useRef(false);

  /** Persiste y publica la lista. Lanza si no pudo escribir (quien llama deshace lo programado). */
  const fijar = useCallback((lista: RecordatorioJuridico[]) => {
    guardarRecordatorios(lista);
    ref.current = lista;
    setRecordatorios(lista);
  }, []);

  /** Un cambio a la vez: dos toques casi simultáneos no se pisan ni duplican. */
  const enCola = useCallback(<T,>(tarea: () => Promise<T>): Promise<T> => {
    const p = cola.current.then(tarea, tarea);
    cola.current = p.catch(() => undefined);
    return p;
  }, []);

  // ── Reconciliar con lo que Android tiene programado ──────────────────────────────────
  const reconciliar = useCallback(() => enCola(async () => {
    if (!cargado.current) return;
    let programadas: Set<string>;
    try { programadas = await idsProgramados(); } catch { return; }
    const ahora = new Date();
    const zona = zonaHoraria();
    let lista = [...ref.current];
    let cambio = false;
    for (const accion of planReconciliar(lista, programadas, ahora, zona)) {
      const i = lista.findIndex((r) => r.id === accion.id);
      if (i < 0 || accion.tipo === 'ok') continue;
      const r = lista[i];
      if (accion.tipo === 'purgar') { lista = lista.filter((x) => x.id !== r.id); cambio = true; continue; }
      if (accion.tipo === 'marcar') { lista[i] = { ...r, estado: accion.estado }; cambio = true; continue; }
      try {
        if (accion.tipo === 'reprogramar') {
          // Otra zona horaria: la MISMA fecha y hora de pared, en la zona nueva.
          await cancelarIds(r.notificationIds);
          const nuevo = await programarEnAndroid({ ...r, zona }, ahora);
          lista[i] = { ...r, zona, notificationIds: nuevo.ids, programadasHasta: nuevo.programadasHasta };
        } else {
          const nuevo = await rellenarMensual(r, r.notificationIds.filter((id) => programadas.has(id)), ahora);
          lista[i] = { ...r, notificationIds: nuevo.ids, programadasHasta: nuevo.programadasHasta };
        }
      } catch {
        lista[i] = { ...r, estado: 'perdido' }; // no se pudo (¿sin permiso?): se dice, no se finge
      }
      cambio = true;
    }
    if (cambio) { try { fijar(lista); } catch { /* se reintenta la próxima vez */ } }
  }), [enCola, fijar]);

  // ── Arranque: cargar, reconciliar y recoger la notificación que abrió la app ────────
  const procesarToque = useCallback((t: ToqueDeNotificacion) => {
    if (vistos.current.has(t.clave)) return; // el mismo toque llega por dos caminos (arranque y evento)
    vistos.current.add(t.clave);
    setToque(t);
  }, []);

  useEffect(() => {
    configurarManejador();
    void prepararCanal().catch(() => undefined);
    let vigente = true;
    void leerRecordatorios().then((lista) => {
      if (!vigente) return;
      ref.current = lista;
      setRecordatorios(lista);
      cargado.current = true;
      setCargando(false);
      void reconciliar();
    });
    // App cerrada: la notificación que la abrió. App abierta o en segundo plano: el evento.
    try {
      const inicial = ultimoToque();
      if (inicial) { procesarToque(inicial); limpiarUltimoToque(); }
    } catch { /* sin toque previo */ }
    const suscripcion = alTocar((t) => { procesarToque(t); limpiarUltimoToque(); });
    const estado = AppState.addEventListener('change', (s) => { if (s === 'active') void reconciliar(); });
    return () => { vigente = false; suscripcion.remove(); estado.remove(); };
  }, [procesarToque, reconciliar]);

  // ── API ─────────────────────────────────────────────────────────────────────────────
  const armar = (id: string, n: NuevoRecordatorio, previo?: RecordatorioJuridico): RecordatorioJuridico => ({
    id, notificationIds: [], titulo: n.titulo, tipo: n.tipo, fechaHora: aClave(n.fecha, n.hora), zona: zonaHoraria(),
    documentoId: n.documentoId, documentoNombre: n.documentoNombre,
    fechaReferencia: n.fechaReferencia ? aClaveFecha(n.fechaReferencia) : undefined,
    repeticion: n.repeticion, creadoEn: previo?.creadoEn ?? new Date().toISOString(), estado: 'programado',
  });

  const validar = (n: NuevoRecordatorio) => {
    // Se revalida JUSTO antes de programar: el usuario pudo tardar en confirmar.
    if (!esFutura(n.fecha, n.hora, new Date(), MARGEN_MS)) throw FECHA_PASADA;
  };

  const programar = useCallback((n: NuevoRecordatorio) => enCola(async () => {
    validar(n);
    const nuevo = armar(nuevoId(), n);
    // Ya existe uno igual: es un doble toque o una confirmación repetida, no otro recordatorio.
    const igual = ref.current.find((r) => r.estado === 'programado' && claveDeDuplicado(r) === claveDeDuplicado(nuevo));
    if (igual) return igual;
    const { ids, programadasHasta } = await programarEnAndroid(nuevo);
    const completo = { ...nuevo, notificationIds: ids, programadasHasta };
    try {
      fijar([...ref.current, completo]);
    } catch (e) {
      await cancelarIds(ids); // no se pudo guardar: no queda un aviso huérfano
      throw e;
    }
    return completo;
  }), [enCola, fijar]);

  const reemplazar = useCallback((id: string, n: NuevoRecordatorio) => enCola(async () => {
    const anterior = ref.current.find((r) => r.id === id);
    if (!anterior) throw { mensaje: 'Ese recordatorio ya no existe.', codigo: 'NO_ENCONTRADO', estado: 0 };
    validar(n);
    // Transaccional: primero se programa el NUEVO; solo entonces se cancela el anterior. Si algo
    // falla antes, el anterior sigue intacto y no hay dos avisos.
    const nuevo = armar(id, n, anterior);
    const { ids, programadasHasta } = await programarEnAndroid(nuevo);
    const completo = { ...nuevo, notificationIds: ids, programadasHasta };
    try {
      fijar(ref.current.map((r) => (r.id === id ? completo : r)));
    } catch (e) {
      await cancelarIds(ids);
      throw e;
    }
    await cancelarIds(anterior.notificationIds);
    return completo;
  }), [enCola, fijar]);

  const cancelar = useCallback((id: string) => enCola(async () => {
    const r = ref.current.find((x) => x.id === id);
    if (!r) return;
    await cancelarIds(r.notificationIds);
    fijar(ref.current.filter((x) => x.id !== id));
  }), [enCola, fijar]);

  const comprobarPermiso = useCallback(() => consultarPermiso(), []);
  const pedirPermiso = useCallback(() => pedirPermisoSistema(), []);
  const consumirToque = useCallback((clave: string) => setToque((actual) => (actual?.clave === clave ? null : actual)), []);

  const valor = useMemo<Valor>(() => ({
    disponible: true, cargando, recordatorios, toque, comprobarPermiso, pedirPermiso, programar, reemplazar, cancelar, consumirToque,
  }), [cargando, recordatorios, toque, comprobarPermiso, pedirPermiso, programar, reemplazar, cancelar, consumirToque]);
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}
