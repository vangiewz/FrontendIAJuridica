import { useState } from 'react';
import { FuenteDisponible, ReporteIngesta } from '../../models/administracion';
import { ArchivoSeleccionado } from '../../models/documentos';
import { ApiError } from '../../models/shared';
import { listarFuentes, ingestarNormativa } from '../../services/administracion';
import { seleccionarDocumento } from '../../services/selectorArchivos';

const EXTENSIONES_NORMATIVA = ['.pdf'] as const;

function esApiError(e: unknown): e is ApiError {
  return typeof e === 'object' && e !== null && 'estado' in e && 'mensaje' in e;
}

function mensajeDeError(e: unknown): string {
  if (!esApiError(e)) {
    return 'No pudimos conectar con el servidor. Verificá que el backend esté corriendo y volvé a intentar.';
  }

  switch (e.estado) {
    case 400:
      return e.mensaje || 'La fuente seleccionada no está soportada.';
    case 401:
      return 'Tu sesión expiró. Volvé a iniciar sesión.';
    case 403:
      return 'Tu cuenta no tiene permisos de administrador para incorporar normativa.';
    case 409:
      return e.mensaje || 'No se encontró el archivo de la fuente en el servidor.';
    case 422:
      // Mensaje del backend: PDF ilegible, sin capa de texto, o corpus incompleto.
      return e.mensaje || 'El archivo no se pudo procesar como fuente normativa.';
    default:
      if (e.estado >= 500) {
        return 'El servidor tuvo un problema al procesar la normativa. Intentá de nuevo en unos minutos.';
      }
      return e.mensaje || 'No pudimos procesar la normativa.';
  }
}

export function useIngestaNormativa() {
  const [fuentes, setFuentes] = useState<FuenteDisponible[]>([]);
  const [fuenteElegida, setFuenteElegida] = useState<string | null>(null);
  const [archivo, setArchivo] = useState<ArchivoSeleccionado | null>(null);
  const [reporte, setReporte] = useState<ReporteIngesta | null>(null);
  const [cargandoFuentes, setCargandoFuentes] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargarFuentes = async () => {
    setCargandoFuentes(true);
    setError(null);
    try {
      const disponibles = await listarFuentes();
      setFuentes(disponibles);
      // Con una sola fuente soportada no tiene sentido obligar a elegirla.
      if (disponibles.length === 1) setFuenteElegida(disponibles[0].clave);
    } catch (e) {
      setError(mensajeDeError(e));
    } finally {
      setCargandoFuentes(false);
    }
  };

  const elegirFuente = (clave: string) => {
    setFuenteElegida(clave);
    setReporte(null);
    setError(null);
  };

  const seleccionarArchivo = async () => {
    setError(null);
    try {
      const elegido = await seleccionarDocumento(EXTENSIONES_NORMATIVA);
      if (!elegido) return; // cancelo el selector
      if (elegido.extension !== '.pdf') {
        setError('La normativa se incorpora desde un archivo PDF.');
        return;
      }
      setArchivo(elegido);
      setReporte(null);
    } catch {
      setError('No pudimos abrir el selector de archivos. Volvé a intentar.');
    }
  };

  const quitarArchivo = () => {
    setArchivo(null);
    setReporte(null);
  };

  const procesar = async () => {
    if (!fuenteElegida || procesando) return;

    setProcesando(true);
    setError(null);
    try {
      setReporte(await ingestarNormativa(fuenteElegida, archivo));
    } catch (e) {
      setReporte(null);
      setError(mensajeDeError(e));
    } finally {
      setProcesando(false);
    }
  };

  return {
    fuentes,
    fuenteElegida,
    archivo,
    reporte,
    cargandoFuentes,
    procesando,
    error,
    cargarFuentes,
    elegirFuente,
    seleccionarArchivo,
    quitarArchivo,
    procesar,
  };
}
