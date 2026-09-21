import { esErrorDeTransporte } from '../erroresTransporte';

export type Desenlace = 'exito' | 'reintentar' | 'descartar' | 'pausar';

export function clasificar(e: unknown): { desenlace: Desenlace; mensaje: string } {
  if (esErrorDeTransporte(e)) {
    return { desenlace: 'reintentar', mensaje: 'Error de red. Se reintentará más tarde.' };
  }

  const err = e as { estado?: number, mensaje?: string };
  const status = err?.estado;
  const mensaje = err?.mensaje || 'Error desconocido';

  if (!status) {
    return { desenlace: 'reintentar', mensaje };
  }

  if (status >= 200 && status < 300) {
    return { desenlace: 'exito', mensaje };
  }
  if (status >= 500 || status === 429) {
    return { desenlace: 'reintentar', mensaje };
  }
  if (status === 409) {
    return { desenlace: 'exito', mensaje };
  }
  if (status === 400 || status === 422) {
    return { desenlace: 'descartar', mensaje };
  }
  if (status === 401) {
    return { desenlace: 'pausar', mensaje: 'Sesión expirada' };
  }

  return { desenlace: 'descartar', mensaje };
}
