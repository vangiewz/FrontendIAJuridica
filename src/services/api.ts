import { leerSesion, borrarSesion, guardarSesion } from './almacenamiento';
import { ApiError } from '../models/shared';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';

export interface OpcionesPeticion extends RequestInit {
  params?: Record<string, string>;
}

export async function peticion<T>(ruta: string, opciones: OpcionesPeticion = {}): Promise<T> {
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

  let res = await fetch(url.toString(), { ...opciones, headers });

  if (res.status === 401 && tokens?.refresh_token && !ruta.includes('/refresh')) {
    // try refresh once
    const refreshRes = await fetch(`${BASE_URL}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: tokens.refresh_token })
    });
    
    if (refreshRes.ok) {
      const newTokens = await refreshRes.json();
      await guardarSesion(newTokens);
      headers.set('Authorization', `Bearer ${newTokens.access_token}`);
      res = await fetch(url.toString(), { ...opciones, headers });
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
    if (typeof errData.detail === 'string') {
      mensajeError = errData.detail;
    } else if (Array.isArray(errData.detail) && errData.detail.length > 0 && errData.detail[0].msg) {
      mensajeError = errData.detail[0].msg;
    } else if (typeof errData.message === 'string') {
      mensajeError = errData.message;
    }

    const error: ApiError = {
      mensaje: mensajeError,
      codigo: (errData.code as string) || 'API_ERROR',
      estado: res.status
    };
    throw error;
  }

  const contentType = res.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return res.json();
  }
  return res.text() as unknown as T;
}
