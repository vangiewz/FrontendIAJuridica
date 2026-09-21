/**
 * Lógica pura del escáner (sin React Native ni módulos nativos): se prueba sola.
 *
 * El OCR refleja lo que la cámara vio: aquí NADA corrige, reescribe ni «mejora» el texto.
 * Solo se ordena por página, se cuenta y se decide si alcanza para el análisis.
 */

/** Espejo de MINIMO_CARACTERES en app/services/documentos/extractor_documento.py. */
export const MINIMO_CARACTERES_DOCUMENTO = 200;
/** Lado mayor de la imagen antes del OCR: nítido para texto impreso sin cargar la memoria. */
export const LADO_MAXIMO_PX = 2200;
/** Por debajo de esto una página se considera vacía (una foto de la mesa, por ejemplo). */
export const MINIMO_CARACTERES_PAGINA = 15;
/** La cláusula cabe dentro de los 2000 caracteres que acepta la consulta, con su pregunta. */
export const MAXIMO_CLAUSULA_EN_CONSULTA = 1300;
export const MAXIMO_PREGUNTA_EN_CONSULTA = 500;

export type EstadoOcrPagina = 'pendiente' | 'ok' | 'vacia' | 'error';

export interface PaginaEscaneada {
  id: string;
  /** Imagen ya preparada (orientada, acotada, comprimida) en la caché de la app. */
  uri: string;
  ancho: number;
  alto: number;
  /** Texto reconocido tal cual; `null` mientras no se haya reconocido. */
  texto: string | null;
  estado: EstadoOcrPagina;
  /** Motivo del fallo cuando `estado === 'error'`. */
  motivo?: string;
}

/** Cuántos caracteres visibles (sin espacios ni saltos) tiene un texto. */
export function contarCaracteresUtiles(texto: string): number {
  return texto.replace(/\s+/g, '').length;
}

/** El estado de una página según lo que se reconoció en ella. */
export function estadoDeTexto(texto: string): EstadoOcrPagina {
  return contarCaracteresUtiles(texto) < MINIMO_CARACTERES_PAGINA ? 'vacia' : 'ok';
}

/** Une los bloques del OCR: las líneas de un bloque van juntas y cada bloque es un párrafo. */
export function armarTextoOcr(bloques: { lineas: string[] }[]): string {
  return bloques
    .map((b) => b.lineas.map((l) => l.trim()).filter(Boolean).join('\n'))
    .filter(Boolean)
    .join('\n\n')
    .trim();
}

/**
 * El texto del escaneo entero, con el origen de cada parte:
 *
 *   --- Página 1 ---
 *   texto…
 *
 * Las páginas sin texto se omiten (no se inventa nada para llenarlas).
 */
export function armarTextoEscaneo(paginas: PaginaEscaneada[]): string {
  return paginas
    .map((p, i) => ({ numero: i + 1, texto: (p.texto ?? '').trim() }))
    .filter((p) => p.texto)
    .map((p) => `--- Página ${p.numero} ---\n${p.texto}`)
    .join('\n\n');
}

export type Suficiencia = 'ok' | 'corto' | 'vacio';

/** ¿El texto alcanza para que el backend lo acepte como documento? */
export function evaluarSuficiencia(texto: string): { estado: Suficiencia; caracteres: number } {
  const caracteres = contarCaracteresUtiles(texto);
  if (caracteres === 0) return { estado: 'vacio', caracteres };
  return { estado: caracteres < MINIMO_CARACTERES_DOCUMENTO ? 'corto' : 'ok', caracteres };
}

/** Mueve una página `delta` posiciones (−1 izquierda, +1 derecha). Fuera de rango: no cambia. */
export function moverPagina<T extends { id: string }>(paginas: T[], id: string, delta: number): T[] {
  const desde = paginas.findIndex((p) => p.id === id);
  const hasta = desde + delta;
  if (desde === -1 || hasta < 0 || hasta >= paginas.length) return paginas;
  const copia = [...paginas];
  const [movida] = copia.splice(desde, 1);
  copia.splice(hasta, 0, movida);
  return copia;
}

/** Tamaño destino para que el lado mayor no pase de `maximo`; `null` si ya cabe. */
export function tamanoDestino(ancho: number, alto: number, maximo = LADO_MAXIMO_PX): { width: number } | { height: number } | null {
  if (Math.max(ancho, alto) <= maximo) return null;
  return ancho >= alto ? { width: maximo } : { height: maximo };
}

const dos = (n: number) => String(n).padStart(2, '0');

/**
 * «Escaneo 21-09-2026 14-30 (3 paginas).txt». Solo ASCII a propósito: es el nombre que viaja
 * en el multipart y queda guardado en el backend, y una tilde mal codificada ahí no aporta nada.
 */
export function nombreArchivoEscaneo(fecha: Date, paginas: number): string {
  const dia = `${dos(fecha.getDate())}-${dos(fecha.getMonth() + 1)}-${fecha.getFullYear()}`;
  const hora = `${dos(fecha.getHours())}-${dos(fecha.getMinutes())}`;
  return `Escaneo ${dia} ${hora} (${paginas} ${paginas === 1 ? 'pagina' : 'paginas'}).txt`;
}

/**
 * La consulta que lleva la cláusula fotografiada como contexto. Se manda por el mismo
 * endpoint de consultas (su texto admite 2000 caracteres): no hay otro flujo. Si la
 * cláusula o la pregunta no caben, se recortan y se avisa en el propio texto.
 */
export function componerConsultaConClausula(clausula: string, pregunta: string): string {
  const limpia = clausula.replace(/\s+/g, ' ').trim();
  const recortada = limpia.length > MAXIMO_CLAUSULA_EN_CONSULTA;
  const cuerpo = recortada ? `${limpia.slice(0, MAXIMO_CLAUSULA_EN_CONSULTA).trimEnd()}… (texto recortado)` : limpia;
  const q = pregunta.trim().slice(0, MAXIMO_PREGUNTA_EN_CONSULTA);
  return `Cláusula fotografiada: «${cuerpo}» Pregunta sobre esa cláusula: ${q}`;
}

/** «Clausula escaneada 21-09-2026 14-30.txt» */
export function nombreArchivoClausula(fecha: Date): string {
  const dia = `${dos(fecha.getDate())}-${dos(fecha.getMonth() + 1)}-${fecha.getFullYear()}`;
  return `Clausula escaneada ${dia} ${dos(fecha.getHours())}-${dos(fecha.getMinutes())}.txt`;
}
