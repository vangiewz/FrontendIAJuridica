export type AreaJuridica =
  | 'contratos' | 'obligaciones' | 'derechos_reales'
  | 'sucesiones' | 'responsabilidad_civil';

export type EstadoVigencia = 'vigente' | 'derogado' | 'modificado' | 'sin_verificar';

export interface FuenteLegal {
  articulo: string;
  numero_articulo: number;
  codigo: string;
  epigrafe: string | null;
  texto_citado: string;
  relevancia: number;
  orden: number;
  estado_vigencia: EstadoVigencia;
  fuente_url: string;
}

export interface Consulta {
  id: string;
  texto: string;
  area_juridica: AreaJuridica | null;
  terminos_detectados: string[];
  puntajes_por_area: Record<string, number>;
  fuentes: FuenteLegal[];
  respuesta: null;
  estado: string;
  creada_en: string;
}

export interface ItemHistorial {
  id: string;
  texto: string;
  area_juridica: AreaJuridica | null;
  cantidad_fuentes: number;
  creada_en: string;
}

export interface HistorialResponse {
  total: number;
  items: ItemHistorial[];
}
