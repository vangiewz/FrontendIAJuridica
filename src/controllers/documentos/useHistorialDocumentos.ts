import { useState } from 'react';
import { ItemComparacion, ItemDocumento } from '../../models/documentos';
import { ApiError } from '../../models/shared';
import { listarComparaciones, listarDocumentos } from '../../services/documentos';

function esApiError(e: unknown): e is ApiError {
  return typeof e === 'object' && e !== null && 'estado' in e && 'mensaje' in e;
}

export function mensajeDeErrorHistorial(e: unknown): string {
  if (!esApiError(e)) {
    return 'No pudimos conectar con el servidor. Verificá que el backend esté corriendo.';
  }
  switch (e.estado) {
    case 401:
      return 'Tu sesión expiró. Volvé a iniciar sesión.';
    case 404:
      return 'No encontramos este registro. Puede haberse eliminado.';
    default:
      if (e.estado >= 500) return 'El servidor tuvo un problema. Intentá de nuevo en unos minutos.';
      return e.mensaje || 'No pudimos cargar el historial.';
  }
}

/** Historial de documentos y de comparaciones: solo lectura de lo ya guardado. */
export function useHistorialDocumentos() {
  const [documentos, setDocumentos] = useState<ItemDocumento[]>([]);
  const [comparaciones, setComparaciones] = useState<ItemComparacion[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargar = async () => {
    setCargando(true);
    setError(null);
    try {
      const [docs, comps] = await Promise.all([listarDocumentos(), listarComparaciones()]);
      setDocumentos(docs);
      setComparaciones(comps);
    } catch (e) {
      setError(mensajeDeErrorHistorial(e));
    } finally {
      setCargando(false);
    }
  };

  return { documentos, comparaciones, cargando, error, cargar };
}
