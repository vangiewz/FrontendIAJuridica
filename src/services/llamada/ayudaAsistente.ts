import {
  Capacidad, CAPACIDADES, Disponibilidad, Ejemplo, IdCapacidad, TemaAyuda,
} from '../../config/capacidadesAsistente';

/**
 * Convierte el catálogo (`config/capacidadesAsistente.ts`) en LA RESPUESTA a «¿qué podés hacer?» y a las
 * ayudas parciales. Lógica pura: se prueba sola. No hay ninguna lista de funciones aquí: todo sale del
 * catálogo, filtrado por lo que ESTE dispositivo y ESTA compilación pueden hacer.
 *
 * Cada respuesta tiene dos caras, a propósito:
 *   - `habla`: un resumen CORTO para la voz (nadie quiere oír 40 cosas seguidas), y
 *   - `capacidades`: el detalle completo, para el panel de la llamada y para el chat.
 */

/** Lo que la llamada tiene ahora: sirve para destacar lo relacionado, sin esconder el resto. */
export interface ContextoDeAyuda {
  documentoActivo: boolean;
  analisis: boolean;
  comparacion: boolean;
  generado: boolean;
  reporte: boolean;
}

/** Una capacidad lista para mostrar: ya resuelta para la plataforma (en web, con su variante). */
export interface CapacidadVista {
  id: IdCapacidad;
  titulo: string;
  descripcion: string;
  ejemplos: Ejemplo[];
  detalles: string[];
}

export interface Ayuda {
  /** El tema ya resuelto (`documento_activo` sin documento activo pasa a ser `documentos`). */
  tema: TemaAyuda;
  titulo: string;
  /** Una línea antes de la lista. */
  introduccion: string;
  capacidades: CapacidadVista[];
  /** Frases que tienen sentido AHORA por lo que hay en la llamada (un documento, un reporte…). */
  contextuales: Ejemplo[];
  /** Lo que dice la voz: corto. */
  habla: string;
  /** Lo que NO está disponible aquí y se preguntó explícitamente. */
  noDisponible: string[];
}

export const TITULO_DE_TEMA: Record<TemaAyuda, string> = {
  general: '¿Qué puedo hacer?',
  documento_activo: 'Con este documento',
  consulta: 'Consultas jurídicas',
  voz: 'Conversación por voz',
  paneles: 'Respuestas y fuentes',
  documentos: 'Documentos',
  camara: 'Cámara y escáner',
  comparacion: 'Comparar documentos',
  generacion: 'Generar documentos',
  reportes: 'Reportes',
  salida: 'Guardar y compartir',
  recibir: 'Recibir documentos',
  archivos: 'Guardar, compartir y recibir archivos',
  recordatorios: 'Recordatorios',
};

/** Una capacidad se muestra solo si existe aquí: en web, si tiene variante; en el teléfono, si se cumplen sus requisitos. */
export function esVisible(c: Capacidad, d: Disponibilidad): boolean {
  if (!d.llamada) return c.enWeb !== undefined;
  return (c.requiere ?? []).every((r) => d[r]);
}

export function vistaDe(c: Capacidad, d: Disponibilidad): CapacidadVista {
  if (!d.llamada && c.enWeb) {
    return {
      id: c.id, titulo: c.enWeb.titulo ?? c.titulo, descripcion: c.enWeb.descripcion,
      // Sin llamada no hay órdenes habladas: solo valen las preguntas jurídicas, que se escriben igual.
      ejemplos: c.enWeb.ejemplos ?? c.ejemplos.filter((e) => e.intencion === 'consulta'),
      detalles: c.enWeb.detalles ?? [],
    };
  }
  return { id: c.id, titulo: c.titulo, descripcion: c.descripcion, ejemplos: c.ejemplos, detalles: c.detalles ?? [] };
}

/** Todas las capacidades disponibles aquí, en el orden del catálogo. */
export function capacidadesDisponibles(d: Disponibilidad): CapacidadVista[] {
  return CAPACIDADES.filter((c) => esVisible(c, d)).map((c) => vistaDe(c, d));
}

export const resolverTema = (tema: TemaAyuda, ctx: Pick<ContextoDeAyuda, 'documentoActivo'>): TemaAyuda =>
  tema === 'documento_activo' && !ctx.documentoActivo ? 'documentos' : tema;

/** «a, b y c». */
export function listaNatural(partes: string[]): string {
  if (partes.length <= 1) return partes.join('');
  return `${partes.slice(0, -1).join(', ')} y ${partes[partes.length - 1]}`;
}

// ── Frases que tienen sentido con lo que hay en la llamada ─────────────────────────────────────
interface Sugerencia {
  cuando: (c: ContextoDeAyuda, d: Disponibilidad) => boolean;
  capacidad: IdCapacidad;
  texto: string;
}

// Los textos son EJEMPLOS DEL CATÁLOGO (una prueba lo comprueba): aquí solo se elige cuándo destacarlos.
const SUGERENCIAS: Sugerencia[] = [
  { cuando: (c) => c.documentoActivo && !c.analisis, capacidad: 'analisis', texto: 'Analizá este contrato.' },
  { cuando: (c) => c.analisis, capacidad: 'analisis', texto: 'Mostrame los riesgos.' },
  { cuando: (c) => c.analisis, capacidad: 'comparacion', texto: 'Compará este contrato con otro.' },
  { cuando: (c, d) => c.analisis && d.recordatorios, capacidad: 'recordatorios', texto: 'Recordame revisar este contrato mañana.' },
  { cuando: (c) => c.comparacion, capacidad: 'comparacion', texto: 'Mostrame las diferencias.' },
  { cuando: (c) => c.generado, capacidad: 'generacion', texto: 'Cambiá el plazo a 18 meses.' },
  { cuando: (c, d) => c.generado && d.salida, capacidad: 'salida', texto: 'Guardá este documento.' },
  { cuando: (c) => c.reporte, capacidad: 'reportes', texto: 'Mostralo como gráfico.' },
  { cuando: (c, d) => c.reporte && d.salida, capacidad: 'salida', texto: 'Compartí el reporte.' },
];

export const SUGERENCIAS_CATALOGADAS: readonly { capacidad: IdCapacidad; texto: string }[] = SUGERENCIAS;

/** Hasta cuatro frases relacionadas con lo que la llamada tiene ahora. Sin llamada (web) no hay órdenes habladas. */
export function sugerenciasContextuales(ctx: ContextoDeAyuda, d: Disponibilidad, maximo = 4): Ejemplo[] {
  if (!d.llamada) return [];
  const salida: Ejemplo[] = [];
  for (const s of SUGERENCIAS) {
    if (!s.cuando(ctx, d)) continue;
    const c = CAPACIDADES.find((x) => x.id === s.capacidad);
    if (!c || !esVisible(c, d)) continue;
    const ejemplo = c.ejemplos.find((e) => e.texto === s.texto);
    if (ejemplo && !salida.some((e) => e.texto === ejemplo.texto)) salida.push(ejemplo);
    if (salida.length >= maximo) break;
  }
  return salida;
}

// ── La aclaración de dónde se pide cada cosa ────────────────────────────────────────────────────
/** En el chat: las órdenes habladas viven en la llamada; en web no hay llamada. */
export function notaDeChat(d: Disponibilidad): string {
  return d.llamada
    ? 'Las órdenes habladas se dan durante una llamada: tocá el ícono del teléfono, arriba. ' +
      'En este chat podés escribirme tus consultas jurídicas y adjuntar un documento para preguntarme sobre él.'
    : 'Estás en la versión web: escribime tus consultas jurídicas, adjuntá un documento con el clip y usá las pestañas ' +
      'Documentos, Comparar, Generar y Reportes.';
}

// ── La respuesta ────────────────────────────────────────────────────────────────────────────────
function hablaGeneral(visibles: Capacidad[], d: Disponibilidad): string {
  // En web algunas se dicen distinto: «descargar» los resultados, no «compartirlos».
  const cosas = visibles.map((c) => (!d.llamada && c.enWeb?.hablado !== undefined ? c.enWeb.hablado : c.hablado)).filter(Boolean);
  const lista = cosas.length ? `Puedo ${listaNatural(cosas)}.` : 'Puedo ayudarte con tus consultas jurídicas.';
  return d.llamada
    ? `${lista} Te mostré todas mis funciones en pantalla. Podés pedirme cualquiera de ellas hablando normalmente.`
    : `${lista} Abajo tenés el detalle de cada una.`;
}

function hablaDocumento(visibles: Capacidad[]): string {
  const cosas = visibles.map((c) => c.habladoDocumento).filter((x): x is string => Boolean(x));
  return cosas.length
    ? `Con este documento puedo ${listaNatural(cosas)}. Te mostré ejemplos en pantalla, y podés pedirme cualquiera hablando normalmente.`
    : 'Con este documento podés hacerme preguntas.';
}

/**
 * La ayuda para `tema` en este dispositivo. Nunca inventa: si lo que se preguntó no está disponible
 * (una función de Android en web, recordatorios en una compilación sin notificaciones), lo DICE y no
 * lista la función como si anduviera.
 */
export function explicarAyuda(pedido: TemaAyuda, ctx: ContextoDeAyuda, d: Disponibilidad): Ayuda {
  const tema = resolverTema(pedido, ctx);
  const delTema = CAPACIDADES.filter((c) => tema === 'general' || c.temas.includes(tema));
  const visibles = delTema.filter((c) => esVisible(c, d));
  const ocultas = delTema.filter((c) => !esVisible(c, d) && c.noDisponible);

  const noDisponible = tema === 'general' ? [] : ocultas.map((c) => c.noDisponible);
  const base = { tema, titulo: TITULO_DE_TEMA[tema], noDisponible };

  if (visibles.length === 0) {
    return {
      ...base, introduccion: '', capacidades: [], contextuales: [],
      habla: noDisponible.length ? [...new Set(noDisponible)].join(' ') : 'Eso no está disponible en esta versión de la app.',
    };
  }

  const capacidades = visibles.map((c) => vistaDe(c, d));
  if (tema === 'general') {
    return {
      ...base,
      introduccion: d.llamada
        ? 'Pedímelo hablando normalmente. Estas son mis funciones, con frases para empezar.'
        : 'Esto es lo que puedo hacer.',
      capacidades, contextuales: sugerenciasContextuales(ctx, d), habla: hablaGeneral(visibles, d),
    };
  }
  if (tema === 'documento_activo') {
    return {
      ...base,
      introduccion: 'Con el documento que tenés activo podés pedirme esto.',
      capacidades, contextuales: sugerenciasContextuales(ctx, d), habla: hablaDocumento(visibles),
    };
  }
  const explicaciones = visibles.map((c) => c.explicacionHablada).filter(Boolean);
  return {
    ...base,
    introduccion: '',
    capacidades, contextuales: [],
    habla: `${explicaciones.join(' ')}${d.llamada ? ' Te dejé los detalles en pantalla.' : ''}`.trim(),
  };
}
