/** Fuente normativa que el backend sabe procesar (GET /admin/normativa/fuentes). */
export interface FuenteDisponible {
  clave: string;
  codigo: string;
  archivo: string;
  total_esperado: number;
  fuente_nombre: string;
  fuente_url: string;
}

/** Resultado de una ingesta (POST /admin/normativa/ingestas). */
export interface ReporteIngesta {
  fuente: string;
  codigo: string;
  total_procesados: number;
  insertadas: number;
  actualizadas: number;
  sin_cambios: number;
  por_libro: Record<string, number>;
  por_area: Record<string, number>;
  origen: string; // 'subido' | 'incluido'
}

export function describirOrigen(origen: string): string {
  if (origen === 'subido') return 'Archivo subido por vos';
  if (origen === 'incluido') return 'Archivo incluido en el sistema';
  return origen;
}
