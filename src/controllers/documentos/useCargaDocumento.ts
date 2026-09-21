import { useState } from 'react';
import {
  Analisis,
  ArchivoSeleccionado,
  Documento,
  EXTENSIONES_PERMITIDAS,
  TAMANO_MAXIMO_BYTES,
  formatearTamano,
} from '../../models/documentos';
import { ApiError } from '../../models/shared';
import { seleccionarDocumento } from '../../services/selectorArchivos';
import { analizarDocumento, subirDocumento } from '../../services/documentos';

const FORMATOS_LEGIBLES = EXTENSIONES_PERMITIDAS.map((e) => e.replace('.', '').toUpperCase()).join(', ');
const MAXIMO_LEGIBLE = formatearTamano(TAMANO_MAXIMO_BYTES);

function esApiError(e: unknown): e is ApiError {
  return typeof e === 'object' && e !== null && 'estado' in e && 'mensaje' in e;
}

/** Traduce cualquier falla a algo que el usuario pueda leer. Nunca expone JSON ni stack. */
export function mensajeDeError(e: unknown): string {
  if (!esApiError(e)) {
    // fetch rechaza con TypeError cuando nadie responde: backend apagado, otra URL o sin red.
    return 'No pudimos conectar con el servidor. Verificá que el backend esté corriendo y volvé a intentar.';
  }

  switch (e.estado) {
    case 401:
      return 'Tu sesión expiró. Volvé a iniciar sesión para subir documentos.';
    case 413:
      return `El archivo supera el máximo de ${MAXIMO_LEGIBLE}. Subí una versión más liviana.`;
    case 415:
      return `Ese formato no está admitido. El sistema acepta ${FORMATOS_LEGIBLES}.`;
    case 400:
      return 'No pudimos leer el archivo. Probá abrirlo y volver a guardarlo antes de subirlo.';
    case 404:
      return 'No encontramos el recurso solicitado. Actualizá la aplicación y volvé a intentar.';
    case 409:
      // DocumentoNoAnalizableError: se subio pero no quedo texto para analizar.
      return 'El documento no tiene texto suficiente para extraer información jurídica.';
    case 422:
      return e.mensaje || 'El archivo no pasó la validación del servidor.';
    default:
      if (e.estado >= 500) {
        return 'El servidor tuvo un problema al procesar el documento. Intentá de nuevo en unos minutos.';
      }
      return e.mensaje || 'No pudimos subir el documento.';
  }
}

/** Las mismas reglas que el backend, aplicadas antes de gastar la subida. */
export function validar(archivo: ArchivoSeleccionado): string | null {
  if (!EXTENSIONES_PERMITIDAS.includes(archivo.extension)) {
    return `"${archivo.nombre}" no es un formato admitido. El sistema acepta ${FORMATOS_LEGIBLES}.`;
  }
  if (archivo.tamano !== null && archivo.tamano > TAMANO_MAXIMO_BYTES) {
    return `"${archivo.nombre}" pesa ${formatearTamano(archivo.tamano)} y el máximo es ${MAXIMO_LEGIBLE}.`;
  }
  return null;
}

export function useCargaDocumento() {
  const [archivo, setArchivo] = useState<ArchivoSeleccionado | null>(null);
  const [resultado, setResultado] = useState<Documento | null>(null);
  const [analisis, setAnalisis] = useState<Analisis | null>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [extrayendo, setExtrayendo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorExtraccion, setErrorExtraccion] = useState<string | null>(null);

  const limpiarResultados = () => {
    setResultado(null);
    setAnalisis(null);
    setErrorExtraccion(null);
  };

  const seleccionar = async () => {
    setError(null);
    try {
      const elegido = await seleccionarDocumento();
      if (!elegido) return; // el usuario cerro el selector: no es un error

      const invalido = validar(elegido);
      if (invalido) {
        setArchivo(null);
        limpiarResultados();
        setError(invalido);
        return;
      }

      setArchivo(elegido);
      limpiarResultados();
    } catch {
      setError('No pudimos abrir el selector de archivos. Volvé a intentar.');
    }
  };

  /**
   * Segundo paso: la extraccion vive en otro endpoint, no en la respuesta de la subida.
   * Su error se guarda aparte para no tapar el resultado de la subida, que sigue siendo
   * valido aunque la extraccion falle.
   */
  const extraer = async (documentoId: string) => {
    setExtrayendo(true);
    setErrorExtraccion(null);
    try {
      setAnalisis(await analizarDocumento(documentoId));
    } catch (e) {
      setErrorExtraccion(mensajeDeError(e));
    } finally {
      setExtrayendo(false);
    }
  };

  const analizar = async () => {
    if (!archivo || subiendo) return; // corta el doble envio accidental

    setSubiendo(true);
    setError(null);
    try {
      const documento = await subirDocumento(archivo);
      setResultado(documento);
      // El archivo ya se proceso: para volver a enviar hay que elegir otro,
      // asi no se sube dos veces el mismo por un clic de mas.
      setArchivo(null);

      // Un documento fallido no tiene texto: pedir su extraccion daria 409.
      if (documento.estado === 'completado') {
        await extraer(documento.id);
      }
    } catch (e) {
      setError(mensajeDeError(e));
    } finally {
      setSubiendo(false);
    }
  };

  const limpiar = () => {
    setArchivo(null);
    limpiarResultados();
    setError(null);
  };

  return {
    archivo,
    resultado,
    analisis,
    subiendo,
    extrayendo,
    error,
    errorExtraccion,
    seleccionar,
    analizar,
    limpiar,
  };
}
