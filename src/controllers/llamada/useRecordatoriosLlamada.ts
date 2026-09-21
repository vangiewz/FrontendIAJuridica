import { MutableRefObject, useEffect, useMemo, useRef, useState } from 'react';
import { Linking } from 'react-native';
import { Analisis, ItemDocumento } from '../../models/documentos';
import { FichaDocumento } from '../../models/llamada';
import { obtenerDocumento } from '../../services/documentos';
import {
  aDate, deClaveFecha, esFutura, FechaSimple, fechaDeDate, fechaSinDia, HoraSimple, horaDeDate, sumarDias,
} from '../../services/recordatorios/fechas';
import { aPlanoAlineado, interpretarRecordatorio, primeraOcurrenciaDe, resolverInterpretacion } from '../../services/recordatorios/interpretar';
import {
  fechasFuturasDelAnalisis, fechaHablada, fraseDeConfirmacion, fraseDeCreado, fraseDeEditado, ordenarPorProxima,
  plazosEnDiasHabiles, proximaOcurrencia, RecordatorioJuridico,
} from '../../services/recordatorios/modelo';
import {
  baseDeRecordatorio, buscarRecordatorios, conFecha, conHora, listaParaConfirmar, palabrasClave,
  PropuestaRecordatorio, propuestaDesde, propuestaDeFechaDeDocumento, revalidar,
} from '../../services/recordatorios/propuesta';
import { useRecordatorios, NuevoRecordatorio } from '../recordatorios/RecordatoriosContext';
import { conPantallaDelSistema } from './pantallaDelSistema';
import { PanelLlamada } from './usePanelLlamada';
import { useEstado } from './useEstado';

/**
 * Los RECORDATORIOS JURÍDICOS dentro de la llamada.
 *
 * REGLA CRÍTICA: nada se programa sin confirmación explícita. Todo recorre el mismo camino:
 *
 *   lo que dijo el usuario (o una fecha del documento)
 *     → fecha y hora ABSOLUTAS resueltas de forma determinista (sin Qwen)
 *     → se MUESTRAN en el panel y se DICEN («¿Querés que te recuerde el 8 de octubre de 2026 a las 9:00?»)
 *     → [Confirmar] / «sí»  →  recién entonces `expo-notifications` agenda en Android.
 *
 * «Sí» y «no» solo cuentan mientras haya una propuesta (o una cancelación) esperando decisión.
 * Abrir el panel o el selector de fecha NO toca la voz: solo se pausa la escucha mientras el
 * selector nativo está abierto.
 */

export interface EntradasRecordatorios {
  panel: PanelLlamada;
  hablar: (etiqueta: string, texto: string) => Promise<void>;
  ficha: FichaDocumento | null;
  analisis: Analisis | null;
  /** Abre un documento guardado por el flujo documental de siempre. */
  verDocumento: (item: ItemDocumento) => Promise<void>;
  seleccionandoArchivo: MutableRefObject<boolean>;
  pausarEscucha: () => void;
  reanudarEscucha: () => void;
  saludado: MutableRefObject<boolean>;
  anuncioInicial: MutableRefObject<string | null>;
}

export type EstadoDocumentoAsociado = 'verificando' | 'existe' | 'no_existe';

const HORA_9: HoraSimple = { hora: 9, minuto: 0 };
/** El recordatorio habla del documento activo: «este contrato», «el documento», «revisarlo». */
const MENCIONA_DOCUMENTO = /\b(?:este|ese|el|mi)\s+(?:documento|contrato|archivo|acuerdo|convenio)\b|\b(?:revisarl[oa]|analizarl[oa]|verl[oa]|firmarl[oa]|enviarl[oa]|leerl[oa])\b/;
/** Cuánto se espera tras el análisis antes de ofrecer una fecha: que la voz del análisis ya haya empezado. */
const ESPERA_OFERTA_MS = 1400;

const mensajeDe = (e: unknown, porDefecto: string) => {
  const m = (e as { mensaje?: string })?.mensaje;
  return typeof m === 'string' && m ? m : porDefecto;
};

export function useRecordatoriosLlamada(e: EntradasRecordatorios) {
  const recs = useRecordatorios();
  const recsRef = useRef(recs);
  recsRef.current = recs;
  const [propuesta, fijarPropuesta, propuestaRef] = useEstado<PropuestaRecordatorio | null>(null);
  const [abiertoId, fijarAbiertoId, abiertoRef] = useEstado<string | null>(null);
  const [cancelacionId, fijarCancelacionId, cancelacionRef] = useEstado<string | null>(null);
  const [referenciaDoc, fijarReferenciaDoc, referenciaDocRef] = useEstado<FechaSimple | null>(null);
  const [permiso, setPermiso] = useState<'denegado' | 'denegado_definitivo' | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [documentos, setDocumentos] = useState<Record<string, EstadoDocumentoAsociado>>({});
  const enVuelo = useRef(false);
  /** La última frase que se mandó decir: quien despacha la orden espera a que EMPIECE a sonar antes de reabrir el micrófono. */
  const ultimaHabla = useRef<Promise<void>>(Promise.resolve());
  const habla = (etiqueta: string, texto: string) => {
    const p = e.hablar(etiqueta, texto);
    ultimaHabla.current = p;
    return p;
  };
  const ofrecido = useRef<string | null>(null);

  const ordenados = useMemo(() => ordenarPorProxima(recs.recordatorios, new Date()), [recs.recordatorios]);
  const abierto = recs.recordatorios.find((r) => r.id === abiertoId) ?? null;
  const cancelando = recs.recordatorios.find((r) => r.id === cancelacionId) ?? null;

  // ── Fechas que el backend YA devolvió en el análisis ────────────────────────────────
  const fechasDoc = useMemo(
    () => (e.analisis ? fechasFuturasDelAnalisis(e.analisis, fechaDeDate(new Date())) : []),
    [e.analisis],
  );
  const habilesDoc = useMemo(() => (e.analisis ? plazosEnDiasHabiles(e.analisis) : []), [e.analisis]);
  const referenciaActual = (): FechaSimple | null =>
    referenciaDocRef.current ?? (fechasDoc.length === 1 ? fechasDoc[0].fecha : null);

  // ── Piezas comunes ──────────────────────────────────────────────────────────────────
  const abrirPanel = () => e.panel.abrir({ tipo: 'recordatorio' });
  const documentoActivo = () => (e.ficha ? { id: e.ficha.id, nombre: e.ficha.nombre } : null);
  const documentoDe = (r: RecordatorioJuridico) => (r.documentoId ? { id: r.documentoId, nombre: r.documentoNombre ?? 'Documento' } : null);

  const textoDePropuesta = (p: PropuestaRecordatorio) =>
    p.pendiente ? p.pendiente.mensaje : fraseDeConfirmacion(p);

  /** Muestra la propuesta y la pregunta. NO programa nada. */
  const mostrarPropuesta = (p: PropuestaRecordatorio, texto?: string) => {
    fijarPropuesta(p);
    fijarCancelacionId(null);
    setPermiso(null);
    setAviso(null);
    abrirPanel();
    void habla('recordatorio', texto ?? textoDePropuesta(p));
  };

  const descartarPropuesta = (conVoz: boolean) => {
    fijarPropuesta(null);
    setPermiso(null);
    if (e.panel.contenido?.tipo === 'recordatorio') e.panel.cerrar();
    if (conVoz) void habla('recordatorio-descartado', 'De acuerdo, no creo el recordatorio.');
  };

  // Una propuesta que ya no está a la vista deja de esperar: un «sí» de más tarde no debe crearla.
  useEffect(() => {
    if (propuesta?.modo === 'confirmacion' && e.panel.contenido?.tipo !== 'recordatorio') fijarPropuesta(null);
    if (cancelacionId && e.panel.contenido?.tipo !== 'recordatorio') fijarCancelacionId(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [e.panel.contenido?.tipo]);

  // ── Crear ───────────────────────────────────────────────────────────────────────────
  const crearPorVoz = (texto: string) => {
    if (!recs.disponible) { void habla('rec-no', 'Los recordatorios no están disponibles en esta versión de la app. Instala la versión más reciente en el celular.'); return; }
    const ahora = new Date();
    const i = interpretarRecordatorio(texto, ahora);
    const enPanel = abierto && e.panel.contenido?.tipo === 'recordatorio' ? abierto : null;
    // «Recordame revisarlo mañana» con un documento activo: es de ese documento. Sin mención clara, no se asocia.
    const activo = documentoActivo();
    const deReferencia = !!(i.antes && !i.fechaBase && referenciaDocRef.current);
    const documento = activo && (MENCIONA_DOCUMENTO.test(aPlanoAlineado(texto)) || deReferencia)
      ? activo : (!i.titulo && enPanel ? documentoDe(enPanel) : null);
    // «Recordame mañana» sobre un recordatorio abierto: uno NUEVO que hereda su título y documento (no un snooze del sistema).
    const p = propuestaDesde(i, ahora, {
      referencia: referenciaActual(), documento,
      tituloBase: !i.titulo ? enPanel?.titulo : null, tipoBase: !i.titulo ? enPanel?.tipo : null,
    });
    mostrarPropuesta(p);
  };

  /** Desde el panel del documento: «Crear recordatorio» para una fecha que el backend ya encontró. */
  const crearDesdeFecha = (fecha: FechaSimple) => {
    const doc = documentoActivo();
    if (!doc) return;
    fijarReferenciaDoc(fecha);
    mostrarPropuesta(propuestaDeFechaDeDocumento(fecha, doc, 'confirmacion'));
  };

  /** Para una fecha que el usuario quiere agregar a mano (sin fecha del documento). */
  const crearManual = () => {
    const ahora = new Date();
    const manana = sumarDias(fechaDeDate(ahora), 1);
    mostrarPropuesta(
      { ...propuestaDesde(interpretarRecordatorio('', ahora), ahora, { documento: documentoActivo() }), modo: 'confirmacion', fecha: manana, pendiente: null },
      '¿Para cuándo quieres el recordatorio? Elige la fecha y la hora en el panel.',
    );
  };

  // ── Confirmar (lo ÚNICO que programa) ───────────────────────────────────────────────
  const aNuevo = (p: PropuestaRecordatorio & { fecha: FechaSimple }): NuevoRecordatorio => ({
    titulo: p.titulo, tipo: p.tipo, fecha: p.fecha, hora: p.hora, repeticion: p.repeticion ?? undefined,
    documentoId: p.documento?.id, documentoNombre: p.documento?.nombre, fechaReferencia: p.referencia,
  });

  const confirmar = async () => {
    const original = propuestaRef.current;
    if (!original || enVuelo.current) return; // un doble toque, o «sí» y botón casi a la vez, crean UNO
    enVuelo.current = true;
    setGuardando(true);
    try {
      // Se revalida JUSTO ahora: el usuario pudo tardar en decidir.
      const p = revalidar(original, new Date());
      if (!listaParaConfirmar(p)) {
        fijarPropuesta(p);
        void habla('recordatorio-pendiente', p.pendiente?.mensaje ?? '¿Para qué fecha quieres el recordatorio?');
        return;
      }
      // El permiso se pide AHORA, la primera vez que de verdad se va a crear uno (no al arrancar).
      let estado = await recs.comprobarPermiso();
      if (estado !== 'concedido') estado = await conPantallaDelSistema(e, () => recs.pedirPermiso());
      if (estado !== 'concedido') {
        setPermiso(estado);
        void habla('rec-permiso', 'No tengo permiso para enviarte recordatorios.');
        return;
      }
      setPermiso(null);
      const hoy = fechaDeDate(new Date());
      const creado = p.editandoId ? await recs.reemplazar(p.editandoId, aNuevo(p)) : await recs.programar(aNuevo(p));
      fijarPropuesta(null);
      fijarAbiertoId(creado.id);
      setAviso(p.editandoId ? 'Recordatorio actualizado.' : 'Recordatorio creado.');
      abrirPanel();
      void habla('recordatorio-creado', p.editandoId ? fraseDeEditado(creado, hoy) : fraseDeCreado(creado, hoy));
    } catch (error) {
      const texto = mensajeDe(error, 'No pude programar el recordatorio.');
      if ((error as { codigo?: string })?.codigo === 'FECHA_PASADA') fijarPropuesta(revalidar(original, new Date()));
      setAviso(texto);
      void habla('rec-error', texto);
    } finally {
      enVuelo.current = false;
      setGuardando(false);
    }
  };

  // ── Selector nativo de fecha y hora ─────────────────────────────────────────────────
  const abrirSelector = async (modo: 'date' | 'time') => {
    const p = propuestaRef.current;
    if (!p || guardando) return;
    const { DateTimePickerAndroid } = await import('@react-native-community/datetimepicker');
    const ahora = new Date();
    const valor = aDate(p.fecha ?? fechaDeDate(ahora), p.hora);
    e.pausarEscucha(); // mientras el selector está abierto, el micrófono descansa; la llamada sigue
    DateTimePickerAndroid.open({
      value: valor, mode: modo, is24Hour: true, minimumDate: modo === 'date' ? new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate()) : undefined,
      onChange: (evento, elegida) => {
        e.reanudarEscucha();
        if (evento.type !== 'set' || !elegida || !propuestaRef.current) return;
        const actual = propuestaRef.current;
        fijarPropuesta(modo === 'date' ? conFecha(actual, fechaDeDate(elegida), new Date()) : conHora(actual, horaDeDate(elegida), new Date()));
        setAviso(null);
      },
    });
  };
  const elegirFecha = () => abrirSelector('date');
  const elegirHora = () => abrirSelector('time');

  // ── Responder a lo pendiente por voz («sí», «no», otra fecha) ────────────────────────
  const responder = (accion: 'confirmar' | 'rechazar') => {
    if (cancelacionRef.current) {
      if (accion === 'confirmar') void confirmarCancelacion(true);
      else { fijarCancelacionId(null); void habla('rec-conserva', 'De acuerdo, conservo el recordatorio.'); }
      return;
    }
    const p = propuestaRef.current;
    if (!p) return;
    if (accion === 'rechazar') { descartarPropuesta(true); return; }
    if (p.modo === 'oferta') { mostrarPropuesta({ ...p, modo: 'confirmacion' }); return; } // «sí» a la oferta: ahora sí se muestra fecha y hora para CONFIRMAR
    void confirmar();
  };

  /** «Mejor el viernes», «a las 5»: cambia la propuesta. `false` si no era una fecha (que siga como consulta). */
  const ajustar = (texto: string): boolean => {
    const p = propuestaRef.current;
    if (!p) return false;
    const ahora = new Date();
    const i = interpretarRecordatorio(texto, ahora);
    if (!i.hayDatosDeFecha) return false;
    const referencia = p.referencia ?? (p.modo === 'oferta' ? p.fecha : null) ?? referenciaActual();
    const res = resolverInterpretacion(i, ahora, { referencia, base: p.fecha ? { fecha: p.fecha, hora: p.hora } : null });
    mostrarPropuesta({
      ...p, modo: 'confirmacion', fecha: res.fecha, hora: res.hora, horaOrigen: res.horaOrigen,
      repeticion: res.repeticion ?? (i.fecha || i.antes ? null : p.repeticion), referencia: res.referencia ?? referencia,
      aproximada: res.aproximada, pendiente: res.pendiente, avisos: res.avisos,
    });
    return true;
  };

  /** Una oferta sin contestar caduca en cuanto el usuario habla de otra cosa. */
  const expirarOferta = (esDeRecordatorios: boolean) => {
    if (!esDeRecordatorios && propuestaRef.current?.modo === 'oferta') fijarPropuesta(null);
  };

  // ── Listar, abrir, editar, cancelar ─────────────────────────────────────────────────
  const listar = (conVoz: boolean) => {
    fijarPropuesta(null); fijarCancelacionId(null); fijarAbiertoId(null);
    e.panel.abrir({ tipo: 'recordatorios' });
    if (!conVoz) return;
    const vigentes = ordenados.filter((r) => r.estado !== 'pasado');
    if (vigentes.length === 0) { void habla('rec-lista', 'No tienes recordatorios programados.'); return; }
    const proximo = vigentes[0];
    const prox = proximaOcurrencia(proximo, new Date());
    const cuando = prox ? `${fechaHablada(prox.fecha, fechaDeDate(new Date()))} a las ${prox.hora.hora}${prox.hora.minuto ? `:${String(prox.hora.minuto).padStart(2, '0')}` : ''}` : '';
    void habla('rec-lista', `Tienes ${vigentes.length} ${vigentes.length === 1 ? 'recordatorio' : 'recordatorios'}. El próximo es «${proximo.titulo}», ${cuando}.`);
  };

  const verificarDocumento = (r: RecordatorioJuridico) => {
    if (!r.documentoId) return;
    const id = r.documentoId;
    setDocumentos((d) => ({ ...d, [id]: 'verificando' }));
    obtenerDocumento(id)
      .then(() => setDocumentos((d) => ({ ...d, [id]: 'existe' })))
      .catch((err: { estado?: number }) => setDocumentos((d) => ({ ...d, [id]: err?.estado === 404 ? 'no_existe' : 'existe' })));
  };

  const abrirRecordatorio = (r: RecordatorioJuridico) => {
    fijarPropuesta(null); fijarCancelacionId(null); setPermiso(null); setAviso(null);
    fijarAbiertoId(r.id);
    abrirPanel();
    verificarDocumento(r);
  };

  /** Elige a cuál se refiere la orden. Con varios posibles NO adivina: abre la lista. */
  const elegirObjetivo = (texto: string, verbo: string): RecordatorioJuridico | null => {
    const claves = palabrasClave(texto);
    const enPanel = abierto && e.panel.contenido?.tipo === 'recordatorio' ? abierto : null;
    if (enPanel && (claves.length === 0 || buscarRecordatorios([enPanel], texto).length > 0)) return enPanel;
    const encontrados = buscarRecordatorios(recs.recordatorios, texto);
    if (encontrados.length === 1) return encontrados[0];
    e.panel.abrir({ tipo: 'recordatorios' });
    void habla('rec-elegir', encontrados.length === 0
      ? 'No encontré un recordatorio así. Te muestro los que tienes.'
      : `Tienes ${encontrados.length} recordatorios que coinciden. Elige cuál quieres ${verbo} en el panel.`);
    return null;
  };

  const editar = (r: RecordatorioJuridico, texto: string | null) => {
    const ahora = new Date();
    const base = baseDeRecordatorio(r, ahora);
    const i = interpretarRecordatorio(texto ?? '', ahora);
    // Solo un aviso único y vigente se REEMPLAZA; uno que se repite, o que ya sonó, da uno nuevo.
    const reemplaza = r.estado === 'programado' && !r.repeticion;
    let p = propuestaDesde(i, ahora, {
      base: i.hayDatosDeFecha ? base : null, referencia: deClaveFecha(r.fechaReferencia), documento: documentoDe(r),
      tituloBase: r.titulo, tipoBase: r.tipo, editandoId: reemplaza ? r.id : null,
    });
    if (!i.hayDatosDeFecha) {
      // Sin fecha ni hora nuevas: se muestra el aviso actual y se pide qué cambiar (nada se reprograma sin cambio).
      p = { ...p, fecha: base?.fecha ?? null, hora: base?.hora ?? HORA_9, horaOrigen: 'dicha', pendiente: null };
      mostrarPropuesta(p, '¿Para cuándo lo cambio? Elige la fecha y la hora en el panel, o dímelo.');
      return;
    }
    if (r.repeticion && !i.repeticion && !i.fecha && !i.antes) p = { ...p, repeticion: r.repeticion, fecha: primeraOcurrenciaDe(r.repeticion, p.hora, ahora) };
    mostrarPropuesta(p);
  };

  const posponer = (r: RecordatorioJuridico) => {
    const ahora = new Date();
    const base = baseDeRecordatorio(r, ahora);
    const hora = base?.hora ?? HORA_9;
    const manana = sumarDias(fechaDeDate(ahora), 1);
    const reemplaza = r.estado === 'programado' && !r.repeticion;
    mostrarPropuesta(revalidar({
      modo: 'confirmacion', editandoId: reemplaza ? r.id : null, titulo: r.titulo, tipo: r.tipo, fecha: manana, hora,
      horaOrigen: 'dicha', repeticion: null, referencia: deClaveFecha(r.fechaReferencia), aproximada: null,
      documento: documentoDe(r), pendiente: null, avisos: [],
    }, ahora));
  };

  const iniciarCancelacion = (r: RecordatorioJuridico, conVoz: boolean) => {
    fijarPropuesta(null); fijarAbiertoId(r.id); fijarCancelacionId(r.id); setAviso(null);
    abrirPanel();
    if (conVoz) {
      const prox = proximaOcurrencia(r, new Date());
      void habla('rec-cancelar', `¿Cancelo el recordatorio «${r.titulo}»${prox ? ` del ${fechaSinDia(prox.fecha)}` : ''}?`);
    }
  };

  const confirmarCancelacion = async (conVoz: boolean) => {
    const id = cancelacionRef.current;
    if (!id || enVuelo.current) return;
    enVuelo.current = true;
    setGuardando(true);
    try {
      await recs.cancelar(id);
      fijarCancelacionId(null);
      fijarAbiertoId(null);
      e.panel.abrir({ tipo: 'recordatorios' });
      void habla('rec-cancelado', 'El recordatorio fue cancelado.');
    } catch (error) {
      const texto = mensajeDe(error, 'No pude cancelar el recordatorio.');
      setAviso(texto);
      if (conVoz) void habla('rec-error', texto);
    } finally {
      enVuelo.current = false;
      setGuardando(false);
    }
  };

  const editarPorVoz = (texto: string) => {
    const r = elegirObjetivo(texto, 'cambiar');
    if (r) editar(r, texto);
  };
  const cancelarPorVoz = (texto: string) => {
    const r = elegirObjetivo(texto, 'cancelar');
    if (r) iniciarCancelacion(r, true);
  };

  // ── Documento asociado ──────────────────────────────────────────────────────────────
  const verDocumento = async (r: RecordatorioJuridico) => {
    if (!r.documentoId) return;
    try {
      const d = await obtenerDocumento(r.documentoId);
      setDocumentos((m) => ({ ...m, [d.id]: 'existe' }));
      await e.verDocumento({ id: d.id, nombre_archivo: d.nombre_archivo, tipo_documento: d.tipo_documento, estado: d.estado, subido_en: d.subido_en });
    } catch (error) {
      if ((error as { estado?: number })?.estado === 404) {
        setDocumentos((m) => ({ ...m, [r.documentoId!]: 'no_existe' }));
        setAviso('El documento asociado ya no está disponible.');
      } else {
        setAviso(mensajeDe(error, 'No pude abrir el documento ahora.'));
      }
    }
  };

  // ── Permiso denegado: reintentar, ajustes ───────────────────────────────────────────
  const reintentarPermiso = () => { void confirmar(); };
  const abrirAjustes = () => { void Linking.openSettings(); };

  // ── Una notificación tocada: se muestra el recordatorio, sin abrir otra llamada ─────────
  useEffect(() => {
    const t = recs.toque;
    if (!t || recs.cargando) return;
    recs.consumirToque(t.clave);
    const r = recs.recordatorios.find((x) => x.id === t.recordatorioId);
    if (!r) {
      e.panel.abrir({ tipo: 'recordatorios' });
      const texto = 'Ese recordatorio ya no existe.';
      if (!e.saludado.current) e.anuncioInicial.current = texto; else void habla('rec-toque', texto);
      return;
    }
    abrirRecordatorio(r);
    const texto = r.documentoId ? 'Tenés un recordatorio sobre este contrato.' : `Tenés un recordatorio: ${r.titulo}.`;
    // Antes del saludo, el aviso ocupa su lugar; después, se dice en cuanto el asistente calle.
    if (!e.saludado.current) e.anuncioInicial.current = texto; else void habla('rec-toque', texto);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recs.toque, recs.cargando]);

  // ── Ofrecer (NUNCA crear) una fecha que el análisis ya trajo ────────────────────────
  useEffect(() => {
    const a = e.analisis;
    const doc = documentoActivo();
    if (!a || !doc || ofrecido.current === a.id || !recs.disponible) return;
    ofrecido.current = a.id;
    fijarReferenciaDoc(null);
    if (fechasDoc.length === 0 && habilesDoc.length === 0) return;
    // Un momento después del resumen del análisis, para no pisarlo: `hablar` espera a que termine.
    const espera = setTimeout(() => {
      if (fechasDoc.length === 1) {
        const f = fechasDoc[0];
        fijarPropuesta(propuestaDeFechaDeDocumento(f.fecha, doc, 'oferta'));
        void habla('rec-oferta', `Encontré una fecha en el documento: el ${fechaSinDia(f.fecha)}${f.encabezado ? `, en «${f.encabezado}»` : ''}. ¿Querés que te recuerde?`);
      } else if (fechasDoc.length > 1) {
        void habla('rec-oferta', `Encontré ${fechasDoc.length} fechas futuras en el documento. Las dejé en el panel por si quieres crear un recordatorio.`);
      } else {
        void habla('rec-habiles', 'El documento indica plazos en días hábiles. No los calculo: si quieres un recordatorio, dime la fecha exacta.');
      }
    }, ESPERA_OFERTA_MS);
    return () => clearTimeout(espera);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [e.analisis?.id]);

  /** Para el enrutador de voz: qué está esperando decisión. */
  const contexto = () => ({
    recordatorio: (cancelacionRef.current ? 'cancelacion' : propuestaRef.current?.modo ?? null) as 'oferta' | 'confirmacion' | 'cancelacion' | null,
    recordatorioAbierto: !!abiertoRef.current && e.panel.contenido?.tipo === 'recordatorio',
    recordatorios: recs.recordatorios.filter((r) => r.estado !== 'pasado').length,
  });

  return {
    disponible: recs.disponible, recordatorios: ordenados, propuesta, abierto, cancelando, permiso, guardando, aviso,
    documentos, fechasDoc, habilesDoc,
    esperarHabla: () => ultimaHabla.current, contexto, crearPorVoz, editarPorVoz, cancelarPorVoz, responder, ajustar, expirarOferta, listar: () => listar(true),
    // Acciones de los botones del panel (no hablan: un toque no le pisa la voz al asistente)
    confirmar: () => { void confirmar(); }, elegirFecha, elegirHora, crearDesdeFecha, crearManual,
    descartarPropuesta: () => descartarPropuesta(false), abrirLista: () => listar(false), abrir: abrirRecordatorio,
    editar: (r: RecordatorioJuridico) => editar(r, null), posponer, iniciarCancelacion: (r: RecordatorioJuridico) => iniciarCancelacion(r, false),
    confirmarCancelacion: () => { void confirmarCancelacion(false); }, volverDeCancelacion: () => fijarCancelacionId(null),
    verDocumento, reintentarPermiso, abrirAjustes, esFutura: (f: FechaSimple, h: HoraSimple) => esFutura(f, h, new Date()),
  };
}

export type RecordatoriosLlamada = ReturnType<typeof useRecordatoriosLlamada>;
