import { useEffect, useState } from 'react';
import { Analisis, DocumentoDetalle } from '../../models/documentos';
import { obtenerAnalisis, obtenerDocumento } from '../../services/documentos';
import { mensajeDeErrorHistorial } from './useHistorialDocumentos';

function es404(e: unknown): boolean {
  return typeof e === 'object' && e !== null && (e as { estado?: number }).estado === 404;
}

/**
 * Reabre un documento ya procesado: lee el documento y su analisis guardado.
 *
 * Nunca vuelve a subir el archivo ni a ejecutar el analisis. Si el documento
 * existe pero nunca se analizo, el backend responde 404 en el analisis y eso no
 * es un error de pantalla: simplemente no hay analisis que mostrar.
 */
export function useDocumentoGuardado(documentoId: string) {
  const [documento, setDocumento] = useState<DocumentoDetalle | null>(null);
  const [analisis, setAnalisis] = useState<Analisis | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let vigente = true;

    const cargar = async () => {
      setCargando(true);
      setError(null);
      try {
        const detalle = await obtenerDocumento(documentoId);
        if (!vigente) return;
        setDocumento(detalle);

        try {
          const guardado = await obtenerAnalisis(documentoId);
          if (vigente) setAnalisis(guardado);
        } catch (e) {
          if (!vigente) return;
          if (es404(e)) setAnalisis(null);
          else setError(mensajeDeErrorHistorial(e));
        }
      } catch (e) {
        if (vigente) setError(mensajeDeErrorHistorial(e));
      } finally {
        if (vigente) setCargando(false);
      }
    };

    if (documentoId) cargar();
    return () => {
      vigente = false;
    };
  }, [documentoId]);

  return { documento, analisis, cargando, error };
}
