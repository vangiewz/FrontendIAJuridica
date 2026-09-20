export type { AreaJuridica, EstadoVigencia } from '../consultas';

export interface Ubicacion {
  libro: string | null;
  parte: string | null;
  titulo: string | null;
  capitulo: string | null;
  seccion: string | null;
}

export interface ArticuloDetalle {
  id: string;
  codigo: string;
  articulo: string;
  numero_articulo: number;
  epigrafe: string | null;
  texto: string;
  area_juridica: import('../consultas').AreaJuridica | null;
  ubicacion: Ubicacion;
  anterior: number | null;
  siguiente: number | null;
  estado_vigencia: import('../consultas').EstadoVigencia;
  nota_vigencia: string | null;
  fuente_nombre: string;
  fuente_url: string;
}

/**
 * HU-13: el texto original viene de la base, no del modelo, y llega aunque la
 * explicacion falle. `disponible` en false trae el motivo en `motivo`.
 */
export interface ExplicacionArticulo {
  disponible: boolean;
  articulo: string;
  texto_original: string;
  explicacion: string | null;
  ejemplo: string | null;
  motivo: string | null;
}
