import { Platform } from 'react-native';
import { leerSesion, borrarSesion, guardarSesion } from './almacenamiento';
import { ApiError } from '../models/shared';
import { BASE_URL, SERVIDOR } from './baseUrl';

export interface OpcionesPeticion extends RequestInit {
  params?: Record<string, string>;
  /**
   * Tiempo máximo de espera de la RESPUESTA (no del procesamiento). Solo para llamadas
   * cortas —arrancar una consulta, leer su avance—: el modelo puede tardar minutos, pero
   * cada llamada individual al servidor no. Sin esto, una red caída deja la petición
   * colgada indefinidamente en el celular.
   */
  timeoutMs?: number;
}

/**
 * Un fallo de red o un tiempo agotado no traen respuesta HTTP: `fetch` lanza un TypeError
 * ("Network request failed" en Android, "Failed to fetch" en web) que no le sirve a nadie.
 * Se traduce a un error propio con un mensaje que dice qué revisar.
 */
function errorDeRed(agotado: boolean): ApiError {
  // El servidor de la PC se sirve por http en la red local; el publicado, por https.
  const web = Platform.OS === 'web' || BASE_URL.startsWith('https://');
  if (agotado) {
    return {
      mensaje: `El servidor (${SERVIDOR}) tardó demasiado en responder. Comprueba la conexión e inténtalo de nuevo.`,
      codigo: 'TIEMPO_AGOTADO', estado: 0,
    };
  }
  return {
    mensaje: web
      ? `No pude conectar con el servidor (${SERVIDOR}). Verifica que esté encendido.`
      : `No pude conectar con el servidor local (${SERVIDOR}). Verifica que el celular y la computadora estén en la misma red y que el servidor esté encendido.`,
    codigo: 'SIN_CONEXION', estado: 0,
  };
}

async function pedir(url: string, init: RequestInit, timeoutMs?: number): Promise<Response> {
  const controlador = timeoutMs && !init.signal ? new AbortController() : null;
  const reloj = controlador ? setTimeout(() => controlador.abort(), timeoutMs) : null;
  try {
    return await fetch(url, controlador ? { ...init, signal: controlador.signal } : init);
  } catch {
    throw errorDeRed(controlador?.signal.aborted === true);
  } finally {
    if (reloj) clearTimeout(reloj);
  }
}

export interface ArchivoDescargado {
  blob: Blob;
  nombre: string;
}

/**
 * La parte comun de toda llamada: token, reintento de refresh y traduccion del error.
 * Devuelve la Response cruda para que cada variante decida como leer el cuerpo (JSON o
 * binario) sin repetir la autenticacion.
 */
async function enviar(ruta: string, opciones: OpcionesPeticion): Promise<Response> {
  const url = new URL(`${BASE_URL}${ruta}`);
  if (opciones.params) {
    Object.keys(opciones.params).forEach(key => url.searchParams.append(key, opciones.params![key]));
  }

  const tokens = await leerSesion();
  const headers = new Headers(opciones.headers || {});

  if (tokens?.access_token) {
    headers.set('Authorization', `Bearer ${tokens.access_token}`);
  }

  if (!headers.has('Content-Type') && !(opciones.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const { params: _params, timeoutMs, ...init } = opciones;
  let res = await pedir(url.toString(), { ...init, headers }, timeoutMs);

  if (res.status === 401 && tokens?.refresh_token && !ruta.includes('/refresh')) {
    // try refresh once
    const refreshRes = await pedir(`${BASE_URL}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: tokens.refresh_token })
    }, timeoutMs);

    if (refreshRes.ok) {
      const newTokens = await refreshRes.json();
      await guardarSesion(newTokens);
      headers.set('Authorization', `Bearer ${newTokens.access_token}`);
      res = await pedir(url.toString(), { ...init, headers }, timeoutMs);
    } else {
      await borrarSesion();
      throw { mensaje: 'Sesión expirada', codigo: 'UNAUTHORIZED', estado: 401 };
    }
  }

  if (!res.ok) {
    let errData: Record<string, unknown> = {};
    try {
      errData = (await res.json()) as Record<string, unknown>;
    } catch (e) {}

    let mensajeError = 'Error en la petición';
    let detalle: unknown;
    const detailObjeto = errData.detail as { mensaje?: unknown } | null | undefined;
    if (typeof errData.detail === 'string') {
      mensajeError = errData.detail;
    } else if (detailObjeto && typeof detailObjeto === 'object' && !Array.isArray(detailObjeto)
      && typeof detailObjeto.mensaje === 'string') {
      // Un error con estructura: el mensaje para el usuario y datos extra (qué campos corregir).
      mensajeError = detailObjeto.mensaje;
      detalle = errData.detail;
    } else if (Array.isArray(errData.detail) && errData.detail.length > 0 && errData.detail[0].msg) {
      mensajeError = errData.detail[0].msg;
    } else if (typeof errData.message === 'string') {
      mensajeError = errData.message;
    }

    const error: ApiError = {
      mensaje: mensajeError,
      codigo: (errData.code as string) || 'API_ERROR',
      estado: res.status,
      ...(detalle !== undefined ? { detalle } : {}),
    };
    throw error;
  }

  return res;
}

export async function peticion<T>(ruta: string, opciones: OpcionesPeticion = {}): Promise<T> {
  const res = await enviar(ruta, opciones);

  const contentType = res.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return res.json();
  }
  return res.text() as unknown as T;
}

/**
 * Para respuestas que son un archivo (xlsx, pdf, docx, pptx). El nombre lo decide el
 * servidor en Content-Disposition; si esa cabecera no llega se usa el de respaldo, y
 * en cualquier caso se limpia para que nunca sea una ruta.
 */
export async function peticionBinaria(
  ruta: string,
  opciones: OpcionesPeticion = {},
  nombrePorDefecto = 'reporte',
): Promise<ArchivoDescargado> {
  const res = await enviar(ruta, opciones);
  const disposicion = res.headers.get('content-disposition') || '';
  const encontrado = /filename="?([^";]+)"?/i.exec(disposicion);
  const crudo = encontrado ? encontrado[1] : nombrePorDefecto;
  const nombre = crudo.replace(/[\\/:*?"<>|]/g, '_').replace(/\.\./g, '_');
  return { blob: await res.blob(), nombre };
}
