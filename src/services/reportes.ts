import { peticion, peticionBinaria } from './api';
import {
  Catalogo, EspecificacionReporte, FormatoExportacion, ReporteResultado,
} from '../models/reportes';

const RUTA = '/api/v1/reportes';

/**
 * Pide un reporte en lenguaje natural. `actual` solo se envia cuando el usuario esta
 * ajustando el reporte que ya tiene en pantalla: el backend interpreta la frase nueva
 * como una modificacion de esa especificacion.
 */
export async function generarReporte(
  peticionTexto: string,
  actual?: EspecificacionReporte | null,
): Promise<ReporteResultado> {
  return peticion<ReporteResultado>(RUTA, {
    method: 'POST',
    body: JSON.stringify({
      peticion: peticionTexto,
      especificacion_actual: actual ?? null,
    }),
  });
}

/** Entidades, campos y reglas que el constructor visual usa para armarse solo. */
export async function obtenerCatalogo(): Promise<Catalogo> {
  return peticion<Catalogo>(`${RUTA}/catalogo`);
}

/**
 * Ejecuta una especificacion armada en el constructor visual. Es el mismo motor que el
 * modo por lenguaje natural, pero sin pasar por el modelo: la especificacion ya esta
 * estructurada. El backend la revalida igual y aplica el filtro por usuario.
 */
export async function ejecutarEspecificacion(
  especificacion: EspecificacionReporte,
): Promise<ReporteResultado> {
  return peticion<ReporteResultado>(`${RUTA}/ejecutar`, {
    method: 'POST',
    body: JSON.stringify({ especificacion }),
  });
}

/**
 * Descarga el reporte como archivo. Se manda la especificacion que ya devolvio el
 * backend: este rehace solo la consulta SQL, sin volver a pasar por el modelo, asi que
 * el archivo trae exactamente los datos que estan en pantalla.
 */
export async function exportarReporte(
  especificacion: EspecificacionReporte,
  formato: FormatoExportacion,
  peticionTexto: string,
) {
  return peticionBinaria(
    `${RUTA}/exportar`,
    {
      method: 'POST',
      body: JSON.stringify({ especificacion, formato, peticion: peticionTexto }),
    },
    `reporte.${formato}`,
  );
}
