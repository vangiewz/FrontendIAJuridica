import { EXTENSIONES_PERMITIDAS, TAMANO_MAXIMO_BYTES, formatearTamano } from '../../models/documentos';

/**
 * Lógica pura de archivos móviles (sin React Native ni módulos nativos): se prueba sola.
 * Aquí viven los tipos MIME, la validación de lo que llega desde otras apps, la
 * deduplicación de un mismo share y los nombres de archivo.
 */

// ── Tipos MIME ──────────────────────────────────────────────────────────────────────────
export const MIME_POR_EXTENSION: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.txt': 'text/plain',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
};

/** Formatos en que el backend EXPORTA (documentos generados y reportes). */
export type FormatoSalida = 'pdf' | 'docx' | 'xlsx' | 'pptx';

export const ETIQUETA_FORMATO: Record<FormatoSalida, string> = {
  pdf: 'PDF', docx: 'Word', xlsx: 'Excel', pptx: 'PowerPoint',
};

export const mimeDeFormato = (formato: FormatoSalida): string => MIME_POR_EXTENSION[`.${formato}`];

/** Alias que algunas apps usan para el mismo tipo. */
const ALIAS_MIME: Record<string, string[]> = {
  '.pdf': ['application/pdf', 'application/x-pdf'],
  '.docx': [MIME_POR_EXTENSION['.docx']],
  '.txt': ['text/plain'],
};
/** MIME que no dicen nada del contenido: ahí manda la extensión. */
const MIME_GENERICOS = ['application/octet-stream', 'binary/octet-stream', '*/*', ''];

export function extensionDeNombre(nombre: string): string {
  const punto = nombre.lastIndexOf('.');
  return punto <= 0 || punto === nombre.length - 1 ? '' : nombre.slice(punto).toLowerCase();
}

function extensionDeMime(mime: string | null): string {
  const m = (mime ?? '').toLowerCase();
  return Object.keys(ALIAS_MIME).find((ext) => ALIAS_MIME[ext].includes(m)) ?? '';
}

/** El MIME REAL para compartir: el de la extensión que conocemos, no un comodín. */
export function mimeDeArchivo(nombre: string, mimeDado?: string | null): string {
  return MIME_POR_EXTENSION[extensionDeNombre(nombre)] ?? (mimeDado || 'application/octet-stream');
}

/** «Contrato.pdf» aunque el nombre viniera sin extensión o con otra. */
export function conExtension(nombre: string, formato: FormatoSalida): string {
  const ext = `.${formato}`;
  return extensionDeNombre(nombre) === ext ? nombre : `${nombre.replace(/\.[A-Za-z0-9]{1,5}$/, '')}${ext}`;
}

/** Un nombre que no exista ya entre `existentes`: «a.pdf» → «a (1).pdf» → «a (2).pdf». Nunca pisa. */
export function nombreUnico(nombre: string, existentes: string[]): string {
  const usados = new Set(existentes.map((n) => n.toLowerCase()));
  if (!usados.has(nombre.toLowerCase())) return nombre;
  const ext = extensionDeNombre(nombre);
  const base = ext ? nombre.slice(0, -ext.length) : nombre;
  for (let i = 1; i < 1000; i++) {
    const candidato = `${base} (${i})${ext}`;
    if (!usados.has(candidato.toLowerCase())) return candidato;
  }
  return `${base} (${Date.now()})${ext}`;
}

// ── Archivos que llegan desde otras apps ─────────────────────────────────────────────────
/** Lo que informa Android de un archivo compartido (ya copiado a la caché privada de la app). */
export interface PayloadRecibido {
  contentUri: string | null;
  contentMimeType: string | null;
  originalName: string | null;
  contentSize: number | null;
}

export interface ArchivoRecibido {
  id: string;
  nombre: string;
  extension: string;
  mime: string;
  tamano: number | null;
  /** `file://` en la caché privada: nunca un `content://`. */
  uri: string;
  recibidoEn: number;
  /** Ya se le dijo al usuario «recibí un documento»: se avisa una sola vez. */
  avisado: boolean;
}

/** Un archivo que no se puede usar: se muestra el motivo y NO se sube. */
export interface RecepcionFallida {
  id: string;
  nombre: string | null;
  motivo: 'formato' | 'tamano' | 'vacio' | 'sin_uri';
  mensaje: string;
  recibidoEn: number;
  avisado: boolean;
}

export type ResultadoNormalizacion =
  | { ok: true; archivo: Pick<ArchivoRecibido, 'nombre' | 'extension' | 'mime' | 'tamano' | 'uri'> }
  | { ok: false; motivo: RecepcionFallida['motivo']; mensaje: string; nombre: string | null };

export const MENSAJES_RECEPCION = {
  formato: 'Este formato no es compatible. Puedo analizar PDF, Word (.docx) y texto (.txt).',
  tamano: `El archivo supera el tamaño permitido (${formatearTamano(TAMANO_MAXIMO_BYTES)}).`,
  vacio: 'El archivo está vacío.',
  sin_uri: 'No pude leer el archivo compartido.',
} as const;

/**
 * La copia en la caché privada como `file:///ruta`, o null si no es un archivo local.
 *
 * `expo-sharing` arma la URI con `java.io.File.toURI()`, que escribe `file:/data/...` (UNA
 * barra). Exigir `file://` descartaba todo archivo compartido. Un `content://` o un `http`
 * siguen sin pasar: solo se usa la copia que el módulo nativo ya dejó en la caché.
 */
export function uriArchivoLocal(uri: string | null | undefined): string | null {
  const m = /^file:\/*(\/.*)$/i.exec((uri ?? '').trim());
  return m ? `file://${m[1].replace(/^\/+/, '/')}` : null;
}

const nombreDeUri = (uri: string): string => {
  try {
    const ultimo = decodeURIComponent(uri.split('?')[0].split('/').pop() ?? '');
    return ultimo.trim();
  } catch {
    return '';
  }
};

/**
 * Convierte lo que informa Android en un archivo utilizable, o dice por qué no. Solo pasan
 * los formatos que el backend realmente procesa (PDF, DOCX, TXT) y dentro de su tamaño
 * máximo. No lee el archivo: decide con su nombre, su tipo declarado y su tamaño.
 */
export function normalizarRecibido(p: PayloadRecibido): ResultadoNormalizacion {
  if (!p.contentUri) return { ok: false, motivo: 'sin_uri', mensaje: MENSAJES_RECEPCION.sin_uri, nombre: p.originalName };

  // Solo el nombre: nunca una ruta que el otro app haya puesto en el nombre.
  const crudo = (p.originalName ?? '').split(/[\\/]/).pop()?.trim() || nombreDeUri(p.contentUri) || 'archivo';
  const mime = (p.contentMimeType ?? '').toLowerCase().trim();
  let extension = extensionDeNombre(crudo);
  if (!extension) extension = extensionDeMime(mime);
  const nombre = extensionDeNombre(crudo) ? crudo : `${crudo}${extension}`;

  const permitida = EXTENSIONES_PERMITIDAS.includes(extension);
  const mimeCoincide = MIME_GENERICOS.includes(mime) || (ALIAS_MIME[extension] ?? []).includes(mime);
  if (!permitida || !mimeCoincide) return { ok: false, motivo: 'formato', mensaje: MENSAJES_RECEPCION.formato, nombre };

  if (p.contentSize === 0) return { ok: false, motivo: 'vacio', mensaje: MENSAJES_RECEPCION.vacio, nombre };
  if (p.contentSize !== null && p.contentSize > TAMANO_MAXIMO_BYTES) {
    return { ok: false, motivo: 'tamano', mensaje: MENSAJES_RECEPCION.tamano, nombre };
  }
  return {
    ok: true,
    archivo: { nombre, extension, mime: MIME_POR_EXTENSION[extension], tamano: p.contentSize, uri: p.contentUri },
  };
}

/** «PDF · 840 KB»: lo que se le muestra al usuario del archivo recibido. */
export function describirArchivo(a: Pick<ArchivoRecibido, 'extension' | 'tamano'>): string {
  const tipo = a.extension.replace('.', '').toUpperCase();
  const peso = formatearTamano(a.tamano);
  return peso ? `${tipo} · ${peso}` : tipo;
}

/** La clave con que se reconoce un mismo share. */
export function claveDeRecepcion(p: PayloadRecibido): string {
  return `${p.contentUri ?? ''}|${p.originalName ?? ''}|${p.contentSize ?? ''}`;
}

/**
 * ¿Es el MISMO share que ya se procesó hace un instante? (re-render, volver a primer plano,
 * un listener repetido). Registra la clave y limpia las viejas. Fuera de la ventana el mismo
 * archivo compartido otra vez es un pedido nuevo del usuario y sí se procesa.
 */
export function esShareRepetido(vistos: Map<string, number>, clave: string, ahora: number, ventanaMs = 4000): boolean {
  for (const [k, cuando] of vistos) if (ahora - cuando > ventanaMs) vistos.delete(k);
  const repetido = vistos.has(clave);
  vistos.set(clave, ahora);
  return repetido;
}
