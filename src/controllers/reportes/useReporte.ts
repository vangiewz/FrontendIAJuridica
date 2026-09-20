import { useCallback, useState } from 'react';
import {
  EspecificacionReporte, FormatoExportacion, ReporteResultado,
} from '../../models/reportes';
import {
  ejecutarEspecificacion, exportarReporte, generarReporte,
} from '../../services/reportes';
import { guardarArchivo } from '../../services/descargas';

/**
 * Un reporte a la vez. Se guarda el ultimo resultado para dos cosas: mostrarlo y, si el
 * usuario escribe un ajuste ("agrega la cantidad de riesgos"), mandar su especificacion
 * como punto de partida en lugar de reinterpretar la peticion desde cero.
 */
export function useReporte() {
  const [reporte, setReporte] = useState<ReporteResultado | null>(null);
  const [cargando, setCargando] = useState(false);
  const [exportando, setExportando] = useState<FormatoExportacion | null>(null);
  const [error, setError] = useState<string | null>(null);

  /** Descarga usando la especificacion de un reporte concreto, no la del estado. */
  const descargar = useCallback(
    async (fuente: ReporteResultado, formato: FormatoExportacion) => {
      setExportando(formato);
      try {
        guardarArchivo(
          await exportarReporte(fuente.especificacion, formato, fuente.peticion),
        );
      } catch (e: any) {
        setError(e?.mensaje || 'No se pudo exportar el reporte');
      } finally {
        setExportando(null);
      }
    },
    [],
  );

  const pedir = useCallback(
    async (texto: string, continuar: boolean): Promise<boolean> => {
      const limpio = texto.trim();
      if (limpio.length < 3) {
        setError('Escribí el reporte que necesitás.');
        return false;
      }
      setCargando(true);
      setError(null);
      try {
        // Solo se reutiliza la especificacion cuando el usuario pidio un ajuste.
        const anterior = continuar ? reporte?.especificacion ?? null : null;
        const resultado = await generarReporte(limpio, anterior);
        setReporte(resultado);
        setCargando(false);
        // Si la frase nombraba un formato ("...y exportalo a Excel"), la descarga sale
        // sola. El reporte ya quedo en pantalla: pedir el archivo no lo reemplaza.
        if (resultado.exportacion) {
          await descargar(resultado, resultado.exportacion);
        }
        return true;
      } catch (e: any) {
        setError(e?.mensaje || 'No se pudo generar el reporte');
        setCargando(false);
        return false;
      }
    },
    [reporte, descargar],
  );

  const exportar = useCallback(
    async (formato: FormatoExportacion) => {
      if (reporte) await descargar(reporte, formato);
    },
    [reporte, descargar],
  );

  /**
   * Ejecuta una especificacion armada en el constructor visual. Deja el resultado en el
   * mismo estado que el modo por lenguaje natural, asi que se muestra y se exporta por
   * el mismo camino.
   */
  const ejecutar = useCallback(async (spec: EspecificacionReporte): Promise<boolean> => {
    setCargando(true);
    setError(null);
    try {
      setReporte(await ejecutarEspecificacion(spec));
      return true;
    } catch (e: any) {
      setError(e?.mensaje || 'No se pudo generar el reporte');
      return false;
    } finally {
      setCargando(false);
    }
  }, []);

  const limpiar = useCallback(() => {
    setReporte(null);
    setError(null);
  }, []);

  return { reporte, cargando, exportando, error, pedir, ejecutar, exportar, limpiar };
}
