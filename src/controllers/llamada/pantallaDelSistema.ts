import { MutableRefObject } from 'react';
import { liberarAlVolver } from '../../services/archivos/pantallaSistema';

export interface EntradasPantallaDelSistema {
  seleccionandoArchivo: MutableRefObject<boolean>;
  pausarEscucha: () => void;
  reanudarEscucha: () => void;
}

/**
 * Corre algo que abre una pantalla del sistema (el share sheet, el selector de carpeta, el
 * permiso de notificaciones). NO es abandonar la llamada: mientras está a la vista se marca
 * «pantalla del sistema abierta a propósito» —para que la app en segundo plano no corte la voz
 * del asistente— y al volver se reanuda la escucha si el asistente no está hablando.
 */
export async function conPantallaDelSistema<T>(e: EntradasPantallaDelSistema, tarea: () => Promise<T>): Promise<T> {
  e.seleccionandoArchivo.current = true;
  e.pausarEscucha();
  try {
    return await tarea();
  } finally {
    liberarAlVolver(() => { e.seleccionandoArchivo.current = false; e.reanudarEscucha(); });
  }
}
