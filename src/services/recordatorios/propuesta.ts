import { esFutura, FechaSimple, HoraSimple, HORA_POR_DEFECTO, diaSemanaDe } from './fechas';
import {
  Interpretacion, MENSAJES_PENDIENTE, MotivoPendiente, OrigenHora, primeraOcurrenciaDe, Recurrencia,
  resolverInterpretacion, TipoRecordatorio,
} from './interpretar';
import { nombreCorto, proximaOcurrencia, RecordatorioJuridico } from './modelo';

/**
 * La PROPUESTA de recordatorio: lo que se le MUESTRA al usuario antes de programar nada. Lógica
 * pura. Una propuesta nunca es un recordatorio: solo `Confirmar` la convierte en uno. Mientras
 * es propuesta, la fecha y la hora se pueden cambiar tantas veces como haga falta.
 */
export interface PropuestaRecordatorio {
  /** `oferta`: una fecha del documento («¿querés que te recuerde?»). `confirmacion`: fecha y hora concretas. */
  modo: 'oferta' | 'confirmacion';
  /** Si se está cambiando uno existente, su id; el nuevo se programa ANTES de cancelar el anterior. */
  editandoId: string | null;
  titulo: string;
  tipo: TipoRecordatorio;
  fecha: FechaSimple | null;
  hora: HoraSimple;
  horaOrigen: OrigenHora;
  repeticion: Recurrencia | null;
  /** La fecha de la que se cuenta el aviso (p. ej. la del documento). */
  referencia: FechaSimple | null;
  aproximada: 'dia_semana' | 'anio' | 'dia_mes' | null;
  documento: { id: string; nombre: string } | null;
  pendiente: { motivo: MotivoPendiente; mensaje: string } | null;
  avisos: string[];
}

export interface ContextoPropuesta {
  referencia?: FechaSimple | null;
  documento?: { id: string; nombre: string } | null;
  /** Título a usar si la frase no dijo uno (p. ej. al copiar un recordatorio existente). */
  tituloBase?: string | null;
  tipoBase?: TipoRecordatorio | null;
  base?: { fecha: FechaSimple; hora: HoraSimple } | null;
  editandoId?: string | null;
  modo?: PropuestaRecordatorio['modo'];
}

/** El título cuando el usuario no dictó uno: neutro, sin inventar qué es la fecha. */
export function tituloPorDefecto(documento: { nombre: string } | null | undefined, tipo: TipoRecordatorio): string {
  if (tipo === 'pago') return 'Pago';
  return documento ? `Recordatorio · ${nombreCorto(documento.nombre)}` : 'Recordatorio';
}

/** De lo que se DIJO a una propuesta: fecha y hora concretas, o lo que falta para tenerlas. */
export function propuestaDesde(i: Interpretacion, ahora: Date, ctx: ContextoPropuesta = {}): PropuestaRecordatorio {
  const res = resolverInterpretacion(i, ahora, { referencia: ctx.referencia ?? null, base: ctx.base ?? null });
  const tipo: TipoRecordatorio = i.tipo !== 'personalizado' ? i.tipo : ctx.tipoBase ?? 'personalizado';
  const documento = ctx.documento ?? null;
  return {
    modo: ctx.modo ?? 'confirmacion',
    editandoId: ctx.editandoId ?? null,
    titulo: i.titulo ?? ctx.tituloBase ?? tituloPorDefecto(documento, tipo),
    tipo,
    fecha: res.fecha,
    hora: res.hora,
    horaOrigen: res.horaOrigen,
    repeticion: res.repeticion,
    referencia: res.referencia ?? ctx.referencia ?? null,
    aproximada: res.aproximada,
    documento,
    pendiente: res.pendiente,
    avisos: res.avisos,
  };
}

/** Una fecha del documento ofrecida al usuario: el aviso propuesto es ESA fecha, a la hora por defecto. */
export function propuestaDeFechaDeDocumento(
  fecha: FechaSimple, documento: { id: string; nombre: string }, modo: PropuestaRecordatorio['modo'],
): PropuestaRecordatorio {
  return {
    modo, editandoId: null, titulo: tituloPorDefecto(documento, 'personalizado'), tipo: 'personalizado',
    fecha, hora: { ...HORA_POR_DEFECTO }, horaOrigen: 'defecto', repeticion: null, referencia: fecha, aproximada: null,
    documento, pendiente: null, avisos: [],
  };
}

/** Vuelve a comprobar que sea futuro y actualiza lo pendiente. Se llama tras cada cambio y antes de confirmar. */
export function revalidar(p: PropuestaRecordatorio, ahora: Date): PropuestaRecordatorio {
  if (!p.fecha) return { ...p, pendiente: p.pendiente ?? { motivo: 'sin_fecha', mensaje: MENSAJES_PENDIENTE.sin_fecha } };
  if (!esFutura(p.fecha, p.hora, ahora)) {
    return { ...p, pendiente: { motivo: 'pasada', mensaje: MENSAJES_PENDIENTE.pasada } };
  }
  return { ...p, pendiente: null };
}

/** El usuario eligió otra FECHA (selector). En una recurrencia, cambia el día del que se repite. */
export function conFecha(p: PropuestaRecordatorio, fecha: FechaSimple, ahora: Date): PropuestaRecordatorio {
  let repeticion = p.repeticion;
  let nueva = fecha;
  if (repeticion?.tipo === 'mensual') {
    repeticion = { tipo: 'mensual', dia: fecha.dia };
    nueva = primeraOcurrenciaDe(repeticion, p.hora, ahora);
  } else if (repeticion?.tipo === 'semanal') {
    repeticion = { tipo: 'semanal', diaSemana: diaSemanaDe(fecha) };
    nueva = primeraOcurrenciaDe(repeticion, p.hora, ahora);
  }
  return revalidar({ ...p, modo: 'confirmacion', fecha: nueva, repeticion, aproximada: null, avisos: [] }, ahora);
}

/** El usuario eligió otra HORA (selector): ahora es exacta, ya no «inferida». */
export function conHora(p: PropuestaRecordatorio, hora: HoraSimple, ahora: Date): PropuestaRecordatorio {
  let fecha = p.fecha;
  if (p.repeticion && fecha) fecha = primeraOcurrenciaDe(p.repeticion, hora, ahora);
  return revalidar({ ...p, modo: 'confirmacion', hora, horaOrigen: 'dicha', fecha }, ahora);
}

/** Lo que se le entrega a `programar`. Solo si la propuesta está lista. */
export function listaParaConfirmar(p: PropuestaRecordatorio | null): p is PropuestaRecordatorio & { fecha: FechaSimple } {
  return !!p && p.modo === 'confirmacion' && p.fecha !== null && p.pendiente === null;
}

// ── Buscar un recordatorio por lo que dijo el usuario ─────────────────────────────────────
const RELLENO = new Set(['el', 'la', 'los', 'las', 'del', 'de', 'un', 'una', 'mi', 'mis', 'este', 'ese', 'esa', 'esta', 'para',
  'que', 'con', 'sobre', 'lo', 'al', 'por', 'y', 'a', 'en', 'recordatorio', 'recordatorios', 'aviso', 'avisos', 'proximo', 'me',
  'cancela', 'cancelalo', 'cancelar', 'eliminar', 'elimina', 'borra', 'borrar', 'quita', 'anula', 'cambia', 'cambiar',
  'modifica', 'edita', 'pospone', 'posponer', 'posponelo', 'pasa', 'pasalo', 'mueve', 'reprograma', 'todos', 'todo', 'hora',
  'fecha', 'dia', 'ahora', 'por', 'favor', 'quiero', 'necesito', 'manana', 'hoy', 'pasado']);

const planoBasico = (t: string) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]+/g, ' ');

/** Las palabras que identifican de CUÁL se habla: «cancelá el recordatorio del contrato» → ['contrato']. */
export function palabrasClave(frase: string): string[] {
  return planoBasico(frase).split(/\s+/).filter((w) => w.length >= 3 && !RELLENO.has(w) && !/^\d+$/.test(w));
}

/**
 * Los recordatorios a los que se refiere la frase, por su título o su documento. Sin palabras
 * que los distingan devuelve todos los candidatos: quien llama decide si son uno (se usa) o
 * varios (se pide elegir). Nunca elige uno «por adivinación» entre varios.
 */
export function buscarRecordatorios(items: RecordatorioJuridico[], frase: string): RecordatorioJuridico[] {
  const candidatos = items.filter((r) => r.estado !== 'pasado');
  const claves = palabrasClave(frase);
  if (claves.length === 0) return candidatos;
  const coinciden = candidatos.filter((r) => {
    const haystack = planoBasico(`${r.titulo} ${r.documentoNombre ?? ''}`);
    return claves.some((k) => haystack.includes(k));
  });
  return coinciden;
}

/** La propuesta para cambiar un recordatorio existente (o copiarlo, si ya sonó): su fecha y hora vigentes como base. */
export function baseDeRecordatorio(r: RecordatorioJuridico, ahora: Date): { fecha: FechaSimple; hora: HoraSimple } | null {
  const prox = proximaOcurrencia(r, ahora);
  return prox ? { fecha: prox.fecha, hora: prox.hora } : null;
}
