import { useEffect, useState } from 'react';
import { DocumentoGenerado, FormatoBorrador, VersionResumen } from '../../models/generacion';
import {
  exportarBorrador, listarVersiones, obtenerGenerado, revisarDocumento,
} from '../../services/generacion';
import { guardarArchivo } from '../../services/descargas';

/**
 * Un borrador identificado por su id. Se reconstruye desde el backend, asi que
 * recargar la pagina o volver desde otra pantalla lo recupera igual.
 */
export function useBorrador(id: string) {
  const [documento, setDocumento] = useState<DocumentoGenerado | null>(null);
  const [versiones, setVersiones] = useState<VersionResumen[]>([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [exportando, setExportando] = useState<FormatoBorrador | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setCargando(false);
      setError('Falta el identificador del borrador');
      return;
    }
    let vigente = true;
    setCargando(true);
    obtenerGenerado(id)
      .then((valor) => {
        if (!vigente) return;
        setDocumento(valor);
        setError(null);
        return listarVersiones(id).then((lista) => {
          if (vigente) setVersiones(lista);
        });
      })
      .catch((e: any) => {
        if (vigente) setError(e.mensaje || 'No se pudo cargar el borrador');
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });
    // Evita escribir sobre un componente ya desmontado si el usuario vuelve antes.
    return () => {
      vigente = false;
    };
  }, [id]);

  /** Devuelve el id de la version nueva; la anterior queda intacta en el backend. */
  const revisar = async (cambio: { instruccion?: string; contenido?: string }): Promise<string | null> => {
    setGuardando(true);
    setError(null);
    try {
      return (await revisarDocumento(id, cambio)).id;
    } catch (e: any) {
      setError(e.mensaje || 'No se pudo guardar la nueva versión');
      return null;
    } finally {
      setGuardando(false);
    }
  };

  /** Baja esta version como archivo. No genera nada nuevo ni crea otra version. */
  const exportar = async (formato: FormatoBorrador) => {
    setExportando(formato);
    setError(null);
    try {
      guardarArchivo(await exportarBorrador(id, formato));
    } catch (e: any) {
      setError(e?.mensaje || 'No se pudo exportar el borrador');
    } finally {
      setExportando(null);
    }
  };

  return { documento, versiones, cargando, guardando, exportando, error, revisar, exportar };
}
