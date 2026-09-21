/**
 * Fechas y horas LOCALES para los recordatorios. Lógica pura (sin React Native): se prueba sola.
 *
 * Un recordatorio guarda la intención de fecha y hora LOCALES («el 8 de octubre a las 9:00»),
 * no un instante UTC: el usuario piensa en su reloj de pared. Aquí una fecha es solo
 * {año, mes, día} y una hora solo {hora, minuto}; se convierten a `Date` únicamente al programar,
 * con la zona horaria del propio dispositivo. Ninguna función usa UTC ni la zona de un servidor.
 */

export interface FechaSimple { anio: number; mes: number; dia: number } // mes 1..12
export interface HoraSimple { hora: number; minuto: number }

export const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto',
  'septiembre', 'octubre', 'noviembre', 'diciembre'];
/** Índice = `Date.getDay()`: 0 domingo … 6 sábado. */
export const DIAS_SEMANA = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
export const HORA_POR_DEFECTO: HoraSimple = { hora: 9, minuto: 0 };

const dos = (n: number) => String(n).padStart(2, '0');

export const diasDelMes = (anio: number, mes: number) => new Date(anio, mes, 0).getDate();

export function esFechaValida(f: FechaSimple): boolean {
  if (![f.anio, f.mes, f.dia].every(Number.isInteger)) return false;
  if (f.anio < 2000 || f.anio > 2200 || f.mes < 1 || f.mes > 12 || f.dia < 1) return false;
  return f.dia <= diasDelMes(f.anio, f.mes);
}

export const esHoraValida = (h: HoraSimple) =>
  Number.isInteger(h.hora) && Number.isInteger(h.minuto) && h.hora >= 0 && h.hora <= 23 && h.minuto >= 0 && h.minuto <= 59;

export const fechaDeDate = (d: Date): FechaSimple => ({ anio: d.getFullYear(), mes: d.getMonth() + 1, dia: d.getDate() });
export const horaDeDate = (d: Date): HoraSimple => ({ hora: d.getHours(), minuto: d.getMinutes() });

/** El instante en la zona del dispositivo. Es lo único que se le da a Android. */
export const aDate = (f: FechaSimple, h: HoraSimple = { hora: 0, minuto: 0 }): Date =>
  new Date(f.anio, f.mes - 1, f.dia, h.hora, h.minuto, 0, 0);

export const compararFechas = (a: FechaSimple, b: FechaSimple) =>
  (a.anio - b.anio) || (a.mes - b.mes) || (a.dia - b.dia);

export const mismaFecha = (a: FechaSimple, b: FechaSimple) => compararFechas(a, b) === 0;

/** Sumar días de calendario (al mediodía, para que un cambio de hora no corra el día). */
export function sumarDias(f: FechaSimple, n: number): FechaSimple {
  const d = new Date(f.anio, f.mes - 1, f.dia, 12, 0, 0, 0);
  d.setDate(d.getDate() + n);
  return fechaDeDate(d);
}

/** Sumar meses; si el día no existe en el mes destino (31 de enero + 1 mes) queda el último día. */
export function sumarMeses(f: FechaSimple, n: number): FechaSimple {
  const total = f.anio * 12 + (f.mes - 1) + n;
  const anio = Math.floor(total / 12);
  const mes = (total % 12 + 12) % 12 + 1;
  return { anio, mes, dia: Math.min(f.dia, diasDelMes(anio, mes)) };
}

/** Días de calendario entre dos fechas (`hasta` − `desde`). */
export function diasEntre(desde: FechaSimple, hasta: FechaSimple): number {
  const a = Date.UTC(desde.anio, desde.mes - 1, desde.dia);
  const b = Date.UTC(hasta.anio, hasta.mes - 1, hasta.dia);
  return Math.round((b - a) / 86400000);
}

export const diaSemanaDe = (f: FechaSimple) => new Date(f.anio, f.mes - 1, f.dia, 12).getDay();

/** La próxima vez que cae ese día de la semana, ESTRICTAMENTE después de `desde` (nunca hoy). */
export function proximoDiaSemana(desde: FechaSimple, diaSemana: number): FechaSimple {
  const salto = ((diaSemana - diaSemanaDe(desde) + 7) % 7) || 7;
  return sumarDias(desde, salto);
}

/** ¿Es una fecha y hora FUTURAS? `margenMs` deja un colchón (p. ej. lo que tarda Android en agendar). */
export const esFutura = (f: FechaSimple, h: HoraSimple, ahora: Date, margenMs = 0) =>
  aDate(f, h).getTime() > ahora.getTime() + margenMs;

// ── Texto para mostrar y decir ───────────────────────────────────────────────────────────
const capitalizar = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

/** «15 de octubre de 2026». */
export const fechaSinDia = (f: FechaSimple) => `${f.dia} de ${MESES[f.mes - 1]} de ${f.anio}`;
/** «Viernes 25 de septiembre de 2026». */
export const fechaLarga = (f: FechaSimple) => capitalizar(`${DIAS_SEMANA[diaSemanaDe(f)]} ${fechaSinDia(f)}`);
/** «25/09/2026». */
export const fechaCorta = (f: FechaSimple) => `${dos(f.dia)}/${dos(f.mes)}/${f.anio}`;
/** «25 SEP» para las listas. */
export const fechaBreve = (f: FechaSimple) => `${dos(f.dia)} ${MESES[f.mes - 1].slice(0, 3).toUpperCase()}`;
/** «9:00» / «16:30». */
export const horaTexto = (h: HoraSimple) => `${h.hora}:${dos(h.minuto)}`;

// ── Claves de almacenamiento ─────────────────────────────────────────────────────────────
/** «2026-10-08T09:00»: hora de pared, sin zona ni «Z». */
export const aClave = (f: FechaSimple, h: HoraSimple) =>
  `${f.anio}-${dos(f.mes)}-${dos(f.dia)}T${dos(h.hora)}:${dos(h.minuto)}`;

export function deClave(clave: string): { fecha: FechaSimple; hora: HoraSimple } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(clave ?? '');
  if (!m) return null;
  const fecha = { anio: +m[1], mes: +m[2], dia: +m[3] };
  const hora = { hora: +m[4], minuto: +m[5] };
  return esFechaValida(fecha) && esHoraValida(hora) ? { fecha, hora } : null;
}

export const aClaveFecha = (f: FechaSimple) => `${f.anio}-${dos(f.mes)}-${dos(f.dia)}`;
export function deClaveFecha(clave: string | undefined | null): FechaSimple | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(clave ?? '');
  if (!m) return null;
  const f = { anio: +m[1], mes: +m[2], dia: +m[3] };
  return esFechaValida(f) ? f : null;
}

// ── Zona horaria ─────────────────────────────────────────────────────────────────────────
/** La zona REAL del dispositivo (p. ej. «America/La_Paz»); `''` si el motor no la informa. */
export function zonaHoraria(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || '';
  } catch {
    return '';
  }
}

/** Compara zonas sin confundir «no sé» con «cambió»: solo hay cambio si ambas se conocen. */
export const cambioDeZona = (guardada: string, actual: string) => !!guardada && !!actual && guardada !== actual;
