import {
  DIAS_SEMANA, diasDelMes, esFechaValida, esFutura, FechaSimple, fechaDeDate, HORA_POR_DEFECTO, HoraSimple,
  MESES, compararFechas, proximoDiaSemana, sumarDias, sumarMeses,
} from './fechas';

/**
 * Interpreta lo que el usuario DIJO sobre cuándo quiere el recordatorio. Lógica pura y
 * CONSERVADORA: reconoce un conjunto pequeño y claro de expresiones y, cuando no está seguro,
 * lo dice en vez de adivinar. NO es un modelo de lenguaje y no llama a ninguno: el agendado es
 * determinista (fecha + hora + zona del dispositivo → disparador de Android).
 *
 * Qué resuelve: «mañana», «pasado mañana», «hoy», «en 3 días/semanas/meses», «el viernes»,
 * «el 10 de octubre», «15/10/2026», «a las 4», «16:30», «una semana antes» (de una fecha
 * conocida), «el 15 de cada mes», «cada semana el lunes», «todos los días».
 *
 * Qué NO calcula (a propósito): días hábiles, días judiciales, feriados ni plazos legales desde
 * una notificación. Si aparecen, pide la fecha exacta. Todo resultado se le MUESTRA al usuario
 * antes de programar nada.
 */

export type TipoRecordatorio = 'vencimiento' | 'pago' | 'revision' | 'seguimiento' | 'audiencia' | 'personalizado';

export type Recurrencia =
  | { tipo: 'diaria' }
  | { tipo: 'semanal'; diaSemana: number } // 0 domingo … 6 sábado
  | { tipo: 'mensual'; dia: number };       // 1..31

export type OrigenHora = 'dicha' | 'inferida' | 'defecto';

export interface Interpretacion {
  fecha: FechaSimple | null;
  hora: (HoraSimple & { origen: OrigenHora }) | null;
  repeticion: Recurrencia | null;
  /** «una semana antes»: cuánto antes de la fecha de referencia. */
  antes: { cantidad: number; unidad: 'dias' | 'semanas' | 'meses' } | null;
  /** La fecha que se nombró como referencia («antes del 15 de octubre»). */
  fechaBase: FechaSimple | null;
  habiles: boolean;
  /** La fecha (o la de referencia) fue dicha con día y mes, no calculada de «en 10 días» ni «el viernes». */
  fechaExplicita: boolean;
  /** Qué parte de la fecha se completó por su cuenta (el usuario no la dijo). */
  aproximada: 'dia_semana' | 'anio' | 'dia_mes' | null;
  faltaDiaMes: boolean;
  faltaDiaSemana: boolean;
  titulo: string | null;
  tipo: TipoRecordatorio;
  /** Se reconoció algún dato de fecha, hora o recurrencia. */
  hayDatosDeFecha: boolean;
}

// ── Texto ───────────────────────────────────────────────────────────────────────────────
/** Minúsculas y sin acentos, CARÁCTER A CARÁCTER: la posición en el texto original se conserva. */
export const aPlanoAlineado = (t: string) =>
  t.split('').map((c) => c.normalize('NFD')[0]).join('').toLowerCase();

class Texto {
  o: string;
  p: string;
  constructor(t: string) { this.o = t; this.p = aPlanoAlineado(t); }
  /** Busca `re`; si `aceptar` lo da por bueno, lo borra (con espacios) para que no se lea dos veces. */
  tomar(re: RegExp, aceptar: (m: RegExpExecArray) => boolean): boolean {
    const m = re.exec(this.p);
    if (!m || !aceptar(m)) return false;
    const hueco = ' '.repeat(m[0].length);
    this.p = this.p.slice(0, m.index) + hueco + this.p.slice(m.index + m[0].length);
    this.o = this.o.slice(0, m.index) + hueco + this.o.slice(m.index + m[0].length);
    return true;
  }
}

const UNIDADES = ['cero', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez', 'once',
  'doce', 'trece', 'catorce', 'quince', 'dieciseis', 'diecisiete', 'dieciocho', 'diecinueve', 'veinte'];

/** «quince» → 15, «veinticinco» → 25, «treinta y uno» → 31, «un/una» → 1, «7» → 7. */
export function numeroDe(t: string): number | null {
  const s = t.trim();
  if (/^\d{1,2}$/.test(s)) return +s;
  if (s === 'un' || s === 'una') return 1;
  const i = UNIDADES.indexOf(s);
  if (i > 0) return i;
  const v = /^veinti(un|uno|dos|tres|cuatro|cinco|seis|siete|ocho|nueve)$/.exec(s);
  if (v) return 20 + Math.max(1, UNIDADES.indexOf(v[1] === 'un' ? 'uno' : v[1]));
  if (s === 'treinta') return 30;
  if (s === 'treinta y uno' || s === 'treinta y un') return 31;
  return null;
}

const NUM = '(\\d{1,2}|[a-z]+(?: y un[oa]?)?)';
const DIAS = 'lunes|martes|miercoles|jueves|viernes|sabado|domingo';
const MESES_RE = MESES.map((m) => m.replace('septiembre', 'sept?iembre')).join('|');
const HORA_PALABRA = 'una|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|once|doce';
const PERIODO = '(?:\\s*(am|pm)|\\s+(?:de\\s+la|del|por\\s+la|en\\s+la|de)\\s+(manana|tarde|noche|madrugada|mediodia))?';
const indiceDia = (nombre: string) => ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'].indexOf(nombre);
const indiceMes = (nombre: string) => MESES.findIndex((m) => m === nombre || (nombre === 'setiembre' && m === 'septiembre')) + 1;

/** Aplica la parte del día (mañana/tarde/noche, am/pm) a una hora dicha en formato de 12 horas. */
function horaConPeriodo(h: number, m: number, sufijo: string | undefined, palabra: string | undefined) {
  const p = sufijo ?? palabra;
  if (h > 23 || m > 59) return null;
  if (p === 'mediodia') return { hora: 12, minuto: m, origen: 'dicha' as OrigenHora };
  if (p === 'pm' || p === 'tarde' || p === 'noche') {
    if (h > 12) return null;
    const hora = h === 12 ? (p === 'noche' ? 0 : 12) : h + 12;
    return { hora, minuto: m, origen: 'dicha' as OrigenHora };
  }
  if (p === 'am' || p === 'manana' || p === 'madrugada') {
    if (h > 12) return null;
    return { hora: h === 12 && p !== 'manana' ? 0 : h, minuto: m, origen: 'dicha' as OrigenHora };
  }
  // Sin decir mañana ni tarde: de 1 a 6 se entiende de la tarde («a las 4»); el resto, tal cual.
  if (h >= 1 && h <= 6) return { hora: h + 12, minuto: m, origen: 'inferida' as OrigenHora };
  return { hora: h, minuto: m, origen: (h >= 13 || h === 0 ? 'dicha' : 'inferida') as OrigenHora };
}

const PALABRAS_VACIAS = new Set(['para', 'que', 'de', 'del', 'el', 'la', 'los', 'las', 'un', 'una', 'me', 'y', 'a', 'en',
  'por', 'al', 'lo', 'se', 'mi', 'con']);

/** Lo que queda del pedido una vez quitadas las órdenes y las fechas: «revisar este contrato». */
function limpiarTitulo(t: Texto): string | null {
  const disparador = /^\s*(?:por\s+favor\s+)?(?:record\w*|recuerd\w+|avis\w+|agend\w+|(?:crea\w*|program\w*|pon\w*|agreg\w*|hac\w*|genera\w*)\s+(?:me\s+)?(?:un\s+)?recordatorio)(?:\s+(?:para|de|del|sobre|que))?/;
  const m = disparador.exec(t.p);
  let o = t.o;
  if (m) o = ' '.repeat(m[0].length) + o.slice(m[0].length);
  const palabras = o.replace(/[.,;:!?¿¡"«»]/g, ' ').split(/\s+/).filter(Boolean);
  while (palabras.length && PALABRAS_VACIAS.has(aPlanoAlineado(palabras[0]))) palabras.shift();
  while (palabras.length && PALABRAS_VACIAS.has(aPlanoAlineado(palabras[palabras.length - 1]))) palabras.pop();
  const titulo = palabras.join(' ').trim();
  if (titulo.length < 3 || palabras.length > 10) return null;
  return titulo.charAt(0).toUpperCase() + titulo.slice(1);
}

function tipoDe(plano: string): TipoRecordatorio {
  if (/\bpag(?:ar|o|os|ue|a)\b/.test(plano)) return 'pago';
  if (/\bvencim\w*|\bvence\b/.test(plano)) return 'vencimiento';
  if (/\brevis\w*/.test(plano)) return 'revision';
  if (/\baudiencia\b/.test(plano)) return 'audiencia';
  if (/\bseguimiento\b/.test(plano)) return 'seguimiento';
  return 'personalizado';
}

// ── Interpretar ─────────────────────────────────────────────────────────────────────────
export function interpretarRecordatorio(texto: string, ahora: Date): Interpretacion {
  const t = new Texto(texto);
  const hoy = fechaDeDate(ahora);
  const r: Interpretacion = {
    fecha: null, hora: null, repeticion: null, antes: null, fechaBase: null, habiles: false, fechaExplicita: false, aproximada: null,
    faltaDiaMes: false, faltaDiaSemana: false, titulo: null, tipo: 'personalizado', hayDatosDeFecha: false,
  };
  const planoOriginal = t.p;
  r.habiles = /\b(?:habil|habiles|judicial|judiciales|feriado|feriados)\b/.test(t.p);
  let semanalSinDia = false;

  // 1. Recurrencia: «el 15 de cada mes», «cada semana el lunes», «todos los días».
  const mensual =
    t.tomar(new RegExp(`\\b(?:el\\s+)?(?:dia\\s+)?${NUM}\\s+de\\s+cada\\s+mes\\b`), (m) => {
      const d = numeroDe(m[1]);
      if (!d || d > 31) return false;
      r.repeticion = { tipo: 'mensual', dia: d };
      return true;
    }) ||
    t.tomar(/\b(?:cada\s+mes|todos\s+los\s+meses|mensual(?:mente)?)\b(?:\s+(?:el|los)\s+(?:dia\s+)?(\d{1,2})\b)?/, (m) => {
      if (m[1] && +m[1] >= 1 && +m[1] <= 31) r.repeticion = { tipo: 'mensual', dia: +m[1] };
      else r.faltaDiaMes = true;
      return true;
    }) ||
    t.tomar(/\btodos\s+los\s+(\d{1,2})\b(?!\s*(?:meses|dias|semanas|anos))/, (m) => {
      if (+m[1] < 1 || +m[1] > 31) return false;
      r.repeticion = { tipo: 'mensual', dia: +m[1] };
      return true;
    });
  if (!mensual) {
    const semanal =
      t.tomar(new RegExp(`\\b(?:todos\\s+los|cada)\\s+(${DIAS})\\b`), (m) => {
        r.repeticion = { tipo: 'semanal', diaSemana: indiceDia(m[1]) };
        return true;
      }) ||
      t.tomar(/\b(?:cada\s+semana|todas\s+las\s+semanas|semanal(?:mente)?)\b/, () => { semanalSinDia = true; return true; });
    if (!semanal) {
      t.tomar(/\b(?:todos\s+los\s+dias|cada\s+dia|diari(?:o|amente)|a\s+diario)\b/, () => {
        r.repeticion = { tipo: 'diaria' };
        return true;
      });
    }
  }

  // 2. «una semana antes», «3 días antes del …»: cuánto antes de una fecha de referencia.
  t.tomar(new RegExp(`\\b${NUM}\\s+(dias?|semanas?|mes(?:es)?)\\s+antes(?:\\s+(?:de|del))?\\b`), (m) => {
    const n = numeroDe(m[1]);
    if (!n) return false;
    r.antes = { cantidad: n, unidad: m[2].startsWith('dia') ? 'dias' : m[2].startsWith('semana') ? 'semanas' : 'meses' };
    return true;
  }) ||
    t.tomar(/\b(?:el\s+)?dia\s+antes(?:\s+(?:de|del))?\b/, () => { r.antes = { cantidad: 1, unidad: 'dias' }; return true; });

  // 3. Hora («a las 4», «16:30», «a las 8 de la mañana», «mediodía»). Antes que las fechas: así
  //    «de la mañana» no se confunde con «mañana».
  const ponerHora = (h: { hora: number; minuto: number; origen: OrigenHora } | null) => {
    if (!h) return false;
    r.hora = h;
    return true;
  };
  t.tomar(new RegExp(`\\b(?:(?:a|para)\\s+)?(?:las?\\s+)?(\\d{1,2}):(\\d{2})${PERIODO}`), (m) =>
    ponerHora(horaConPeriodo(+m[1], +m[2], m[3], m[4]))) ||
    t.tomar(new RegExp(
      `\\b(?:(?:a|para)\\s+)?(las|la)\\s+(\\d{1,2}|${HORA_PALABRA})\\b(?:\\s+(?:y\\s+(media|cuarto|\\d{1,2})|menos\\s+(cuarto|\\d{1,2})|en\\s+punto))?${PERIODO}`),
    (m) => {
      const h = numeroDe(m[2]);
      if (h === null || h < 1 || h > 24 || (m[1] === 'la' && h !== 1)) return false;
      let hora = h;
      let minuto = 0;
      if (m[3]) minuto = m[3] === 'media' ? 30 : m[3] === 'cuarto' ? 15 : +m[3];
      if (m[4]) { hora = h - 1; minuto = m[4] === 'cuarto' ? 45 : 60 - +m[4]; }
      return ponerHora(horaConPeriodo(hora === 0 ? 12 : hora, minuto, m[5], m[6]));
    }) ||
    t.tomar(/\b(\d{1,2})\s*(am|pm)\b/, (m) => ponerHora(horaConPeriodo(+m[1], 0, m[2], undefined))) ||
    t.tomar(/\bmediodia\b/, () => ponerHora({ hora: 12, minuto: 0, origen: 'dicha' })) ||
    t.tomar(/\bmedianoche\b/, () => ponerHora({ hora: 0, minuto: 0, origen: 'inferida' }));

  // 4. Fecha explícita: «2026-10-15», «15/10/2026», «15/10», «10 de octubre (de 2026)», «quince de octubre».
  const explicitas: FechaSimple[] = [];
  const poner = (anio: number | null, mes: number, dia: number): boolean => {
    if (mes < 1 || mes > 12 || dia < 1 || dia > 31) return false;
    let f: FechaSimple;
    if (anio !== null) {
      f = { anio, mes, dia };
      if (!esFechaValida(f)) return false;
    } else {
      // Sin año: la próxima vez que esa fecha cae. Se marca para decirlo al confirmar.
      f = { anio: hoy.anio, mes, dia };
      for (let i = 0; i < 5 && (!esFechaValida(f) || compararFechas(f, hoy) < 0); i++) f = { anio: f.anio + 1, mes, dia };
      if (!esFechaValida(f)) return false;
      r.aproximada = 'anio';
    }
    explicitas.push(f);
    return true;
  };
  t.tomar(/\b(\d{4})-(\d{1,2})-(\d{1,2})\b/, (m) => poner(+m[1], +m[2], +m[3]));
  t.tomar(/\b(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?\b/, (m) =>
    poner(m[3] ? (m[3].length === 2 ? 2000 + +m[3] : +m[3]) : null, +m[2], +m[1]));
  t.tomar(new RegExp(`\\b${NUM}\\s+de\\s+(${MESES_RE})(?:\\s+(?:de|del)\\s+(\\d{4}))?\\b`), (m) => {
    const dia = numeroDe(m[1]);
    return dia !== null && poner(m[3] ? +m[3] : null, indiceMes(m[2].replace('sept?iembre', 'septiembre')), dia);
  });

  // 5. Fecha relativa o por día de la semana.
  let relativa: FechaSimple | null = null;
  if (explicitas.length === 0) {
    if (t.tomar(/\bpasado\s+manana\b/, () => true)) relativa = sumarDias(hoy, 2);
    else if (t.tomar(/\bmanana\b/, () => true)) relativa = sumarDias(hoy, 1);
    else if (t.tomar(/\bhoy\b/, () => true)) relativa = hoy;
    else {
      t.tomar(new RegExp(`\\ben\\s+${NUM}\\s+(dias?|semanas?|mes(?:es)?)\\b`), (m) => {
        const n = numeroDe(m[1]);
        if (!n) return false;
        relativa = m[2].startsWith('dia') ? sumarDias(hoy, n) : m[2].startsWith('semana') ? sumarDias(hoy, 7 * n) : sumarMeses(hoy, n);
        return true;
      }) ||
        t.tomar(new RegExp(`\\b(?:el\\s+)?(?:proximo\\s+|este\\s+)?(${DIAS})\\b`), (m) => {
          if (semanalSinDia) { r.repeticion = { tipo: 'semanal', diaSemana: indiceDia(m[1]) }; semanalSinDia = false; return true; }
          relativa = proximoDiaSemana(hoy, indiceDia(m[1]));
          r.aproximada = 'dia_semana';
          return true;
        }) ||
        (!r.repeticion && !r.antes && t.tomar(/\bel\s+(\d{1,2})\b(?!\s*[:/.-]\d)/, (m) => {
          const dia = +m[1];
          if (dia < 1 || dia > 31) return false;
          let f: FechaSimple = { anio: hoy.anio, mes: hoy.mes, dia: Math.min(dia, diasDelMes(hoy.anio, hoy.mes)) };
          if (compararFechas(f, hoy) < 0) { const s = sumarMeses({ anio: hoy.anio, mes: hoy.mes, dia: 1 }, 1); f = { ...s, dia: Math.min(dia, diasDelMes(s.anio, s.mes)) }; }
          relativa = f;
          r.aproximada = 'dia_mes';
          return true;
        }));
    }
  }
  if (semanalSinDia) r.faltaDiaSemana = true;

  // Con «N antes» la fecha explícita es la REFERENCIA; sin él, es la fecha del recordatorio.
  r.fechaExplicita = explicitas.length > 0;
  if (r.antes) r.fechaBase = explicitas[0] ?? null;
  else r.fecha = explicitas[0] ?? relativa;

  r.titulo = limpiarTitulo(t);
  r.tipo = tipoDe(planoOriginal);
  r.hayDatosDeFecha = !!(r.fecha || r.hora || r.repeticion || r.antes || r.fechaBase || r.faltaDiaMes || r.faltaDiaSemana || r.habiles);
  return r;
}

// ── Resolver: de lo dicho a una fecha y hora concretas ───────────────────────────────────
export type MotivoPendiente = 'sin_fecha' | 'habiles' | 'pasada' | 'sin_referencia' | 'dia_mes' | 'dia_semana';

export interface Resolucion {
  fecha: FechaSimple | null;
  hora: HoraSimple;
  horaOrigen: OrigenHora;
  repeticion: Recurrencia | null;
  /** La fecha de la que se cuenta «una semana antes» (p. ej. el vencimiento). */
  referencia: FechaSimple | null;
  aproximada: Interpretacion['aproximada'];
  /** Qué falta o por qué no se puede seguir; `null` si hay una fecha y hora futuras para confirmar. */
  pendiente: { motivo: MotivoPendiente; mensaje: string } | null;
  avisos: string[];
}

export const MENSAJES_PENDIENTE: Record<MotivoPendiente, string> = {
  sin_fecha: '¿Para qué fecha quieres el recordatorio?',
  habiles: 'No calculo días hábiles, judiciales ni feriados. Elige la fecha exacta.',
  pasada: 'Esa fecha ya pasó. Elige una fecha futura.',
  sin_referencia: '¿Antes de qué fecha? Dime la fecha o elígela en el panel.',
  dia_mes: '¿Qué día del mes?',
  dia_semana: '¿Qué día de la semana?',
};

/** Primera vez que cae una recurrencia, desde `ahora`. */
export function primeraOcurrenciaDe(rep: Recurrencia, hora: HoraSimple, ahora: Date): FechaSimple {
  const hoy = fechaDeDate(ahora);
  if (rep.tipo === 'diaria') return esFutura(hoy, hora, ahora) ? hoy : sumarDias(hoy, 1);
  if (rep.tipo === 'semanal') {
    const diaHoy = new Date(hoy.anio, hoy.mes - 1, hoy.dia, 12).getDay();
    return diaHoy === rep.diaSemana && esFutura(hoy, hora, ahora) ? hoy : proximoDiaSemana(hoy, rep.diaSemana);
  }
  let f: FechaSimple = { anio: hoy.anio, mes: hoy.mes, dia: Math.min(rep.dia, diasDelMes(hoy.anio, hoy.mes)) };
  if (!esFutura(f, hora, ahora)) {
    const s = sumarMeses({ anio: hoy.anio, mes: hoy.mes, dia: 1 }, 1);
    f = { ...s, dia: Math.min(rep.dia, diasDelMes(s.anio, s.mes)) };
  }
  return f;
}

export function resolverInterpretacion(
  i: Interpretacion, ahora: Date,
  opciones: { referencia?: FechaSimple | null; base?: { fecha: FechaSimple; hora: HoraSimple } | null } = {},
): Resolucion {
  const hora = i.hora ?? (opciones.base ? { ...opciones.base.hora, origen: 'dicha' as OrigenHora } : { ...HORA_POR_DEFECTO, origen: 'defecto' as OrigenHora });
  const res: Resolucion = {
    fecha: null, hora: { hora: hora.hora, minuto: hora.minuto }, horaOrigen: hora.origen, repeticion: i.repeticion,
    referencia: null, aproximada: i.aproximada, pendiente: null, avisos: [],
  };
  const pendiente = (motivo: MotivoPendiente) => { res.pendiente = { motivo, mensaje: MENSAJES_PENDIENTE[motivo] }; return res; };

  if (i.repeticion) {
    res.fecha = primeraOcurrenciaDe(i.repeticion, res.hora, ahora);
    if (i.repeticion.tipo === 'mensual' && i.repeticion.dia > 28) {
      res.avisos.push('En los meses que no tienen ese día, avisaré el último día del mes.');
    }
    return res;
  }
  if (i.faltaDiaMes) return pendiente('dia_mes');
  if (i.faltaDiaSemana) return pendiente('dia_semana');

  // Los días hábiles y los feriados dependen de reglas que esta app no tiene: se pide la fecha.
  if (i.habiles && !i.fechaExplicita) return pendiente('habiles');

  if (i.antes) {
    const referencia = i.fechaBase ?? opciones.referencia ?? null;
    if (!referencia) return pendiente('sin_referencia');
    res.referencia = referencia;
    const { cantidad, unidad } = i.antes;
    res.fecha = unidad === 'dias' ? sumarDias(referencia, -cantidad)
      : unidad === 'semanas' ? sumarDias(referencia, -7 * cantidad)
      : sumarMeses(referencia, -cantidad);
  } else if (i.fecha) {
    res.fecha = i.fecha;
  } else if (opciones.base) {
    res.fecha = opciones.base.fecha; // editar solo la hora: la fecha se conserva
  } else {
    return pendiente('sin_fecha');
  }

  if (!esFutura(res.fecha, res.hora, ahora)) return pendiente('pasada');
  return res;
}

export { DIAS_SEMANA };
