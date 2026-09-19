import { peticion } from './api';
import {
  Analisis, ArchivoSeleccionado, Comparacion, ComparacionesResponse, Documento,
  DocumentoDetalle, DocumentosResponse, ItemComparacion, ItemDocumento,
} from '../models/documentos';

/**
 * Sube el archivo a POST /api/v1/documentos, que extrae el texto y lo clasifica.
 *
 * El campo tiene que llamarse `archivo`: es el nombre del parametro en
 * app/views/documentos/documentos.py y FastAPI lo busca por nombre.
 *
 * No se fija Content-Type a mano a proposito. El boundary del multipart lo escribe
 * fetch al ver un FormData; si se lo pisa con 'multipart/form-data' a secas, el
 * boundary se pierde y el backend responde 422 sin encontrar el archivo.
 */
export async function subirDocumento(archivo: ArchivoSeleccionado): Promise<Documento> {
  const cuerpo = new FormData();

  if (archivo.archivoWeb) {
    cuerpo.append('archivo', archivo.archivoWeb, archivo.nombre);
  } else {
    // En React Native FormData acepta {uri, name, type}, que no existe en el tipo
    // estandar del DOM: de ahi el cast.
    cuerpo.append('archivo', {
      uri: archivo.uri,
      name: archivo.nombre,
      type: archivo.mimeType ?? 'application/octet-stream',
    } as unknown as Blob);
  }

  return peticion<Documento>('/api/v1/documentos', { method: 'POST', body: cuerpo });
}

/**
 * Pide la extraccion de informacion juridica del documento ya subido.
 *
 * El POST es idempotente: si el analisis ya existe, el backend devuelve el que
 * tiene guardado en vez de recalcularlo (ver analizar_documento en
 * app/controllers/contratos/analisis_controller.py).
 */
export async function analizarDocumento(documentoId: string): Promise<Analisis> {
  return peticion<Analisis>(`/api/v1/documentos/${documentoId}/analisis`, { method: 'POST' });
}

/** Documentos ya cargados por el usuario. El backend solo devuelve los propios. */
export async function listarDocumentos(): Promise<ItemDocumento[]> {
  const data = await peticion<DocumentosResponse>('/api/v1/documentos');
  return data.items;
}

/** Detalle de un documento ya subido, con su texto extraído. */
export async function obtenerDocumento(documentoId: string): Promise<DocumentoDetalle> {
  return peticion<DocumentoDetalle>(`/api/v1/documentos/${documentoId}`);
}

/**
 * Análisis YA guardado de un documento. A diferencia del POST, este no calcula
 * nada: si el documento nunca se analizó, el backend responde 404.
 */
export async function obtenerAnalisis(documentoId: string): Promise<Analisis> {
  return peticion<Analisis>(`/api/v1/documentos/${documentoId}/analisis`);
}

export async function listarComparaciones(): Promise<ItemComparacion[]> {
  const data = await peticion<ComparacionesResponse>('/api/v1/documentos/comparaciones');
  return data.items;
}

/** Relee una comparación guardada. No vuelve a compararla. */
export async function obtenerComparacion(comparacionId: string): Promise<Comparacion> {
  return peticion<Comparacion>(`/api/v1/documentos/comparaciones/${comparacionId}`);
}

export async function compararDocumentos(
  documentoAId: string,
  documentoBId: string
): Promise<Comparacion> {
  return peticion<Comparacion>('/api/v1/documentos/comparaciones', {
    method: 'POST',
    body: JSON.stringify({ documento_a_id: documentoAId, documento_b_id: documentoBId }),
  });
}
