import {
  aClave, aClaveFecha, aDate, cambioDeZona, compararFechas, deClave, deClaveFecha, diasDelMes, diasEntre, esFechaValida,
  esFutura, FechaSimple, fechaDeDate, fechaLarga, fechaSinDia, HoraSimple, horaTexto, MESES, sumarDias,
  DIAS_SEMANA,
} from './fechas';
import { primeraOcurrenciaDe, Recurrencia, Resolucion, TipoRecordatorio } from './interpretar';

/**
 * El RECORDATORIO JURÍDICO: su forma, cómo se guarda y cómo se dice. Lógica pura (sin React
 * Native ni Android): se prueba sola.
 *
 * Lo que vive aquí es la METADATA de negocio y de pantalla. El EVENTO programado lo tiene
 * Android (vía `expo-notifications`): esta metadata se reconcilia con lo que Android realmente
 * tiene agendado al arrancar (`planReconciliar`), para no mostrar como activo lo que ya no lo es.
 *
 * Todo es LOCAL de este teléfono: no se sincroniza con otros dispositivos ni con el backend.
 */

export type EstadoRecordatorio = 'programado' | 'pasado' | 'perdido';

export interface RecordatorioJuridico {
  id: string;
  /** Identificadores de Android. Uno normalmente; varios en una recurrencia mensual de día 29–31. */
  notificationIds: string[];
  titulo: string;
  tipo: TipoRecordatorio;
  /** «2026-10-08T09:00»: la fecha y hora LOCALES elegidas (primera ocurrencia si se repite). */
  fechaHora: string;
  /** Zona del dispositivo al crearlo (p. ej. «America/La_Paz»). */
  zona: string;
  documentoId?: string;
  documentoNombre?: string;
  /** «2026-10-15»: la fecha de la que se cuenta el aviso (p. ej. el vencimiento). */
  fechaReferencia?: string;
  repeticion?: Recurrencia;
  /** Recurrencia mensual con ocurrencias explícitas: hasta cuándo hay avisos programados. */
  programadasHasta?: string;
  creadoEn: string;
  estado: EstadoRecordatorio;
}

export const VERSION_ALMACEN = 1;
/** Cuántos avisos mensuales (días 29–31) se mantienen programados por delante. */
export const HORIZONTE_MENSUAL = 12;
/** Un recordatorio único ya vencido se conserva un tiempo (por si se toca su notificación) y luego se limpia. */
export const DIAS_DE_CONSERVACION = 30;

const TIPOS: TipoRecordatorio[] = ['vencimiento', 'pago', 'revision', 'seguimiento', 'audiencia', 'personalizado'];
const ESTADOS: EstadoRecordatorio[] = ['programado', 'pasado', 'perdido'];

let contador = 0;
export const nuevoId = () => `rec-${Date.now().toString(36)}-${(++contador).toString(36)}${Math.random().toString(36).slice(2, 6)}`;

// ── Serialización ───────────────────────────────────────────────────────────────────────
const esTexto = (x: unknown): x is string => typeof x === 'string';

function repeticionValida(r: unknown): r is Recurrencia {
  const x = r as { tipo?: string; diaSemana?: unknown; dia?: unknown };
  if (!x || typeof x !== 'object') return false;
  if (x.tipo === 'diaria') return true;
  if (x.tipo === 'semanal') return Number.isInteger(x.diaSemana) && (x.diaSemana as number) >= 0 && (x.diaSemana as number) <= 6;
  if (x.tipo === 'mensual') return Number.isInteger(x.dia) && (x.dia as number) >= 1 && (x.dia as number) <= 31;
  return false;
}

export function esRecordatorioValido(x: unknown): x is RecordatorioJuridico {
  const r = x as Partial<RecordatorioJuridico> | null;
  if (!r || typeof r !== 'object') return false;
  if (!esTexto(r.id) || !r.id || !esTexto(r.titulo) || !esTexto(r.zona) || !esTexto(r.creadoEn)) return false;
  if (!Array.isArray(r.notificationIds) || !r.notificationIds.every(esTexto)) return false;
  if (!TIPOS.includes(r.tipo as TipoRecordatorio) || !ESTADOS.includes(r.estado as EstadoRecordatorio)) return false;
  if (!esTexto(r.fechaHora) || !deClave(r.fechaHora)) return false;
  for (const k of ['documentoId', 'documentoNombre', 'fechaReferencia', 'programadasHasta'] as const) {
    if (r[k] !== undefined && !esTexto(r[k])) return false;
  }
  if (r.fechaReferencia !== undefined && !deClaveFecha(r.fechaReferencia)) return false;
  return r.repeticion === undefined || repeticionValida(r.repeticion);
}

export const serializarRecordatorios = (items: RecordatorioJuridico[]) =>
  JSON.stringify({ version: VERSION_ALMACEN, items });

/** Lee lo guardado sin confiar en ello: lo que no tiene la forma correcta se descarta, no rompe. */
export function parsearRecordatorios(json: string | null | undefined): RecordatorioJuridico[] {
  if (!json) return [];
  try {
    const dato = JSON.parse(json) as { version?: number; items?: unknown[] };
    if (!dato || !Array.isArray(dato.items)) return [];
    return dato.items.filter(esRecordatorioValido);
  } catch {
    return [];
  }
}

// ── Ocurrencias ─────────────────────────────────────────────────────────────────────────
/** Recurrencia mensual que Android NO representa bien (día 29, 30 o 31): se programa una a una. */
export const usaOcurrenciasExplicitas = (r?: Recurrencia) => r?.tipo === 'mensual' && r.dia > 28;

/** Las próximas `cantidad` fechas de un aviso mensual posteriores a `desde`; en meses cortos, el último día. */
export function ocurrenciasMensuales(dia: number, hora: HoraSimple, desde: Date, cantidad: number): FechaSimple[] {
  const salida: FechaSimple[] = [];
  let anio = desde.getFullYear();
  let mes = desde.getMonth() + 1;
  for (let i = 0; i < 400 && salida.length < cantidad; i++) {
    const f = { anio, mes, dia: Math.min(dia, diasDelMes(anio, mes)) };
    if (aDate(f, hora).getTime() > desde.getTime()) salida.push(f);
    mes += 1;
    if (mes > 12) { mes = 1; anio += 1; }
  }
  return salida;
}

/** La próxima vez que suena (o la fecha única). */
export function proximaOcurrencia(r: RecordatorioJuridico, ahora: Date): { fecha: FechaSimple; hora: HoraSimple } | null {
  const base = deClave(r.fechaHora);
  if (!base) return null;
  if (!r.repeticion) return base;
  return { fecha: primeraOcurrenciaDe(r.repeticion, base.hora, ahora), hora: base.hora };
}

export function ordenarPorProxima(items: RecordatorioJuridico[], ahora: Date): RecordatorioJuridico[] {
  const instante = (r: RecordatorioJuridico) => {
    const p = proximaOcurrencia(r, ahora);
    return p ? aDate(p.fecha, p.hora).getTime() : 0;
  };
  const vigentes = items.filter((r) => r.estado !== 'pasado').sort((a, b) => instante(a) - instante(b));
  const pasados = items.filter((r) => r.estado === 'pasado').sort((a, b) => instante(b) - instante(a));
  return [...vigentes, ...pasados];
}

// ── Lo que dice la notificación (y lo que NO) ────────────────────────────────────────────
/** «contrato_prestamo.pdf» → «contrato prestamo», recortado: en la pantalla bloqueada, poco. */
export function nombreCorto(nombre: string, maximo = 30): string {
  const limpio = nombre.replace(/\.[A-Za-z0-9]{2,5}$/, '').replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
  return limpio.length > maximo ? `${limpio.slice(0, maximo - 1).trimEnd()}…` : limpio;
}

/**
 * El texto de la notificación. PRIVACIDAD: solo un aviso genérico, el título que el propio
 * usuario dictó y, como mucho, el nombre corto del documento. Nunca cláusulas, partes, montos
 * ni fragmentos del documento. (Además, el canal oculta el contenido en la pantalla bloqueada.)
 */
export function textoNotificacion(r: Pick<RecordatorioJuridico, 'tipo' | 'titulo' | 'documentoNombre' | 'fechaHora' | 'fechaReferencia'>) {
  let cuerpo: string;
  const referencia = deClaveFecha(r.fechaReferencia);
  const aviso = deClave(r.fechaHora)?.fecha;
  switch (r.tipo) {
    case 'vencimiento': {
      const dias = referencia && aviso ? diasEntre(aviso, referencia) : null;
      cuerpo = dias === null || dias < 0 ? 'Recordatorio: vencimiento'
        : dias === 0 ? 'Vencimiento hoy'
        : dias === 1 ? 'Vencimiento mañana'
        : `Vencimiento en ${dias} días`;
      break;
    }
    case 'pago': cuerpo = 'Recordatorio de pago'; break;
    case 'revision': cuerpo = 'Recordatorio: revisar documento'; break;
    case 'seguimiento': cuerpo = 'Recordatorio de seguimiento'; break;
    case 'audiencia': cuerpo = 'Recordatorio: fecha importante'; break;
    default: cuerpo = r.titulo.length > 60 ? `${r.titulo.slice(0, 59).trimEnd()}…` : r.titulo;
  }
  if (r.documentoNombre) cuerpo = `${cuerpo} · ${nombreCorto(r.documentoNombre)}`;
  return { titulo: 'Asistente Jurídico', cuerpo };
}

// ── Cómo se dice ────────────────────────────────────────────────────────────────────────
const horaHablada = (h: HoraSimple) => (h.minuto === 0 ? String(h.hora) : horaTexto(h));

/** «mañana», «pasado mañana», o «el 8 de octubre». */
export function fechaHablada(f: FechaSimple, hoy: FechaSimple): string {
  const d = diasEntre(hoy, f);
  if (d === 0) return 'hoy';
  if (d === 1) return 'mañana';
  if (d === 2) return 'pasado mañana';
  return `el ${f.dia} de ${MESES[f.mes - 1]}`;
}

export function describirRecurrencia(rep: Recurrencia, hora: HoraSimple): string {
  const a = `a las ${horaTexto(hora)}`;
  if (rep.tipo === 'diaria') return `todos los días ${a}`;
  if (rep.tipo === 'semanal') return `todos los ${DIAS_SEMANA[rep.diaSemana]} ${a}`;
  return `mensual, el día ${rep.dia} ${a}`;
}

/** Lo que el asistente PREGUNTA antes de programar. Siempre la fecha y la hora absolutas. */
export function fraseDeConfirmacion(res: Resolucion, titulo?: string): string {
  if (!res.fecha) return res.pendiente?.mensaje ?? '';
  if (res.repeticion) {
    const rep = res.repeticion;
    const cuando = rep.tipo === 'mensual' ? `mensual el día ${rep.dia} a las ${horaTexto(res.hora)}`
      : describirRecurrencia(rep, res.hora);
    return `Crearé un recordatorio ${cuando}. ¿Está bien?`;
  }
  const antes = res.referencia ? `La fecha es el ${fechaSinDia(res.referencia)}. ` : '';
  if (res.aproximada === 'dia_semana') {
    return `${antes}¿Este ${fechaLarga(res.fecha).toLowerCase()} a las ${horaTexto(res.hora)}?`;
  }
  const sobre = titulo ? ` (${titulo})` : '';
  return `${antes}¿Querés que te recuerde el ${fechaSinDia(res.fecha)} a las ${horaTexto(res.hora)}${sobre}?`;
}

export function fraseDeCreado(r: RecordatorioJuridico, hoy: FechaSimple): string {
  const base = deClave(r.fechaHora);
  if (!base) return 'Listo.';
  if (r.repeticion) return `Listo. Te recordaré ${describirRecurrencia(r.repeticion, base.hora)}.`;
  return `Listo. Te recordaré ${fechaHablada(base.fecha, hoy)} a las ${horaHablada(base.hora)}.`;
}

export function fraseDeEditado(r: RecordatorioJuridico, hoy: FechaSimple): string {
  const base = deClave(r.fechaHora);
  if (!base) return 'Actualicé el recordatorio.';
  if (r.repeticion) return `Actualicé el recordatorio: ${describirRecurrencia(r.repeticion, base.hora)}.`;
  return `Actualicé el recordatorio para ${fechaHablada(base.fecha, hoy)} a las ${horaHablada(base.hora)}.`;
}

// ── Reconciliar con lo que Android tiene programado ──────────────────────────────────────
export type AccionReconciliar =
  | { id: string; tipo: 'ok' }
  | { id: string; tipo: 'marcar'; estado: 'pasado' | 'perdido' }
  | { id: string; tipo: 'reprogramar' }
  | { id: string; tipo: 'rellenar' }
  | { id: string; tipo: 'purgar' };

/**
 * Compara la metadata guardada con las notificaciones que Android realmente tiene programadas.
 * Un recordatorio que Android ya no tiene NO se muestra como activo: si su fecha pasó (ya sonó)
 * queda «pasado»; si era futura y desapareció, queda «perdido» (se puede reprogramar). Si el
 * dispositivo cambió de zona horaria se reprograma a la MISMA hora local de pared.
 */
export function planReconciliar(
  items: RecordatorioJuridico[], programadas: Set<string>, ahora: Date, zonaActual: string,
): AccionReconciliar[] {
  return items.map((r): AccionReconciliar => {
    const base = deClave(r.fechaHora);
    if (r.estado === 'pasado') {
      const limite = base ? aDate(sumarDias(base.fecha, DIAS_DE_CONSERVACION), base.hora).getTime() : 0;
      return ahora.getTime() > limite ? { id: r.id, tipo: 'purgar' } : { id: r.id, tipo: 'ok' };
    }
    if (r.estado === 'perdido' || !base) return { id: r.id, tipo: 'ok' };

    const presentes = r.notificationIds.filter((id) => programadas.has(id));
    if (usaOcurrenciasExplicitas(r.repeticion)) {
      if (cambioDeZona(r.zona, zonaActual)) return { id: r.id, tipo: 'reprogramar' };
      return presentes.length < HORIZONTE_MENSUAL ? { id: r.id, tipo: 'rellenar' } : { id: r.id, tipo: 'ok' };
    }
    if (presentes.length === 0) {
      if (r.repeticion) return { id: r.id, tipo: 'marcar', estado: 'perdido' };
      return { id: r.id, tipo: 'marcar', estado: esFutura(base.fecha, base.hora, ahora) ? 'perdido' : 'pasado' };
    }
    return cambioDeZona(r.zona, zonaActual) ? { id: r.id, tipo: 'reprogramar' } : { id: r.id, tipo: 'ok' };
  });
}

// ── Duplicados ──────────────────────────────────────────────────────────────────────────
/** Lo que hace «el mismo» recordatorio: para no crearlo dos veces por un doble toque o un eco. */
export const claveDeDuplicado = (r: Pick<RecordatorioJuridico, 'titulo' | 'fechaHora' | 'documentoId' | 'repeticion'>) =>
  `${r.titulo.trim().toLowerCase()}|${r.fechaHora}|${r.documentoId ?? ''}|${JSON.stringify(r.repeticion ?? null)}`;

// ── Fechas que el backend YA devolvió en el análisis de un documento ─────────────────────
interface AnalisisMinimo {
  hallazgos: { tipo: string; texto: string; inicio: number; fin: number; clausula: number | null }[];
  clausulas: { orden: number; encabezado: string; texto: string }[];
}

export interface FechaDeDocumento {
  fecha: FechaSimple;
  /** Tal como está escrita en el documento. */
  texto: string;
  clausula: number | null;
  encabezado: string | null;
}

/**
 * Convierte una fecha ESCRITA en el documento en una fecha real, solo si es inequívoca:
 * «15 de octubre de 2026» o «15/10/2026» (día/mes/año, como se escribe en Bolivia). No adivina.
 */
export function parsearFechaDeDocumento(texto: string): FechaSimple | null {
  const t = texto.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  let m = /^(\d{1,2})\s+de\s+([a-z]+)\s+de\s+(\d{4})$/.exec(t);
  let f: FechaSimple | null = null;
  if (m) {
    const mes = MESES.findIndex((n) => n === m![2] || (m![2] === 'setiembre' && n === 'septiembre')) + 1;
    f = mes ? { anio: +m[3], mes, dia: +m[1] } : null;
  } else if ((m = /^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/.exec(t))) {
    f = { anio: m[3].length === 2 ? 2000 + +m[3] : +m[3], mes: +m[2], dia: +m[1] };
  }
  return f && esFechaValida(f) ? f : null;
}

/** Las fechas FUTURAS del análisis, sin repetir y en orden. Las pasadas no sirven para un recordatorio. */
export function fechasFuturasDelAnalisis(a: AnalisisMinimo, hoy: FechaSimple): FechaDeDocumento[] {
  const vistas = new Set<string>();
  const salida: FechaDeDocumento[] = [];
  for (const h of a.hallazgos) {
    if (h.tipo !== 'fecha') continue;
    const fecha = parsearFechaDeDocumento(h.texto);
    if (!fecha || compararFechas(fecha, hoy) <= 0 || vistas.has(aClaveFecha(fecha))) continue;
    vistas.add(aClaveFecha(fecha));
    const clausula = h.clausula === null ? null : a.clausulas.find((c) => c.orden === h.clausula) ?? null;
    salida.push({ fecha, texto: h.texto, clausula: h.clausula, encabezado: clausula?.encabezado ?? null });
  }
  return salida.sort((x, y) => compararFechas(x.fecha, y.fecha));
}

/**
 * Plazos del documento expresados en días HÁBILES o JUDICIALES. Esta app no tiene el calendario
 * de feriados ni las reglas procesales para calcularlos: solo los detecta para AVISAR.
 */
export function plazosEnDiasHabiles(a: AnalisisMinimo): string[] {
  const salida: string[] = [];
  for (const h of a.hallazgos) {
    if (h.tipo !== 'plazo') continue;
    const clausula = a.clausulas.find((c) => c.orden === h.clausula);
    const i = clausula ? clausula.texto.indexOf(h.texto) : -1;
    if (i < 0) continue;
    const cola = clausula!.texto.slice(i + h.texto.length, i + h.texto.length + 24).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    if (/^\s*(?:\(\d+\)\s*)?(?:de\s+)?(?:habiles|judiciales)/.test(cola)) salida.push(`${h.texto} hábiles`);
  }
  return salida;
}

export { aClave, fechaDeDate };
