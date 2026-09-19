import { useState } from 'react';
import { Comparacion, ItemDocumento, esComparable } from '../../models/documentos';
import { ApiError } from '../../models/shared';
import { compararDocumentos, listarDocumentos } from '../../services/documentos';

function esApiError(e: unknown): e is ApiError {
  return typeof e === 'object' && e !== null && 'estado' in e && 'mensaje' in e;
}

/** Traduce la falla a algo legible. Nunca expone JSON ni stack. */
function mensajeDeError(e: unknown): string {
  if (!esApiError(e)) {
    return 'No pudimos conectar con el servidor. Verificá que el backend esté corriendo y volvé a intentar.';
  }

  switch (e.estado) {
    case 400:
      return e.mensaje || 'Elegí dos documentos distintos para comparar.';
    case 401:
      return 'Tu sesión expiró. Volvé a iniciar sesión para comparar documentos.';
    case 404:
      // El backend responde 404 tambien cuando el documento es de otro usuario.
      return 'No encontramos uno de los documentos. Actualizá la lista y volvé a intentar.';
    case 409:
      return e.mensaje || 'Uno de los documentos no tiene texto extraído para comparar.';
    case 422:
      return 'La solicitud de comparación no es válida. Volvé a elegir los documentos.';
    default:
      if (e.estado >= 500) {
        return 'El servidor tuvo un problema al comparar los documentos. Intentá de nuevo en unos minutos.';
      }
      return e.mensaje || 'No pudimos comparar los documentos.';
  }
}

export function useComparacion() {
  const [documentos, setDocumentos] = useState<ItemDocumento[]>([]);
  const [idA, setIdA] = useState<string | null>(null);
  const [idB, setIdB] = useState<string | null>(null);
  const [comparacion, setComparacion] = useState<Comparacion | null>(null);
  const [cargandoLista, setCargandoLista] = useState(false);
  const [comparando, setComparando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargarDocumentos = async () => {
    setCargandoLista(true);
    setError(null);
    try {
      // Solo los que el backend puede comparar: subir de nuevo no hace falta.
      setDocumentos((await listarDocumentos()).filter(esComparable));
    } catch (e) {
      setError(mensajeDeError(e));
    } finally {
      setCargandoLista(false);
    }
  };

  const elegirA = (id: string) => {
    setComparacion(null);
    setError(null);
    // Elegir en A el que ya estaba en B los intercambia, en vez de dejar dos iguales.
    if (id === idB) setIdB(idA);
    setIdA(id);
  };

  const elegirB = (id: string) => {
    setComparacion(null);
    setError(null);
    if (id === idA) setIdA(idB);
    setIdB(id);
  };

  const comparar = async () => {
    if (!idA || !idB || comparando) return;
    if (idA === idB) {
      setError('Elegí dos documentos distintos para comparar.');
      return;
    }

    setComparando(true);
    setError(null);
    try {
      setComparacion(await compararDocumentos(idA, idB));
    } catch (e) {
      setComparacion(null);
      setError(mensajeDeError(e));
    } finally {
      setComparando(false);
    }
  };

  return {
    documentos,
    idA,
    idB,
    comparacion,
    cargandoLista,
    comparando,
    error,
    cargarDocumentos,
    elegirA,
    elegirB,
    comparar,
  };
}
