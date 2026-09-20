export type AreaJuridica =
  | 'contratos' | 'obligaciones' | 'derechos_reales'
  | 'sucesiones' | 'responsabilidad_civil';

export type EstadoVigencia = 'vigente' | 'derogado' | 'modificado' | 'sin_verificar';

export interface FuenteLegal {
  norma_id: string | null;
  version: number | null;
  /** La respuesta se apoyo en esta fuente, no solo la recupero. */
  utilizada: boolean;
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

export interface ActorIA {
  rol: string;
  nombre: string | null;
  evidencia: string;
}

export interface RelacionIA {
  relacion: string;
  evidencia: string;
}

/** HU-02: lo que el sistema entendio del relato. Todo debe constar en el texto del usuario. */
export interface ContextoIA {
  hechos: string[];
  actores: ActorIA[];
  relaciones: RelacionIA[];
  conceptos: string[];
}

/** Cada fundamento apunta a una norma real y a una cita verificada contra su texto. */
export interface FundamentoIA {
  norma_id: string | null;
  problema?: string | null;
  cita_textual: string;
  explicacion: string;
}

export interface FuenteIA {
  id: string;
  codigo: string;
  numero_articulo: number;
  articulo: string;
  epigrafe: string | null;
  texto: string;
  version: number;
  estado_vigencia: EstadoVigencia;
  fuente_nombre: string;
  fuente_url: string;
  relevancia: number;
  similitud: number | null;
}

export type EstadoRespuesta =
  | 'fundamentada' | 'insuficiente' | 'no_disponible' | 'error_validacion';

/** Un trozo del documento del usuario, citado como evidencia de la respuesta. */
export interface FragmentoDocumentoIA {
  etiqueta: string;
  texto: string;
}

export interface RespuestaJuridicaIA {
  estado: EstadoRespuesta;
  resumen_caso: string;
  area_juridica: string | null;
  contexto: ContextoIA;
  analisis: FundamentoIA[];
  conclusion: string;
  articulos_utilizados: string[];
  fuentes: FuenteIA[];
  /** Evidencia sacada del documento; es independiente de `fuentes`, que son normas. */
  fuentes_documento: FragmentoDocumentoIA[];
  documento_nombre: string | null;
  limitaciones: string[];
  trazabilidad: Record<string, unknown>;
}

/** Que hizo el sistema con la frase. Lo decide el backend, no la pantalla. */
export type Intencion =
  | 'consulta_general' | 'guardar_documento' | 'analizar_documento'
  | 'consulta_documento' | 'consulta_documento_normativa';

export interface Consulta {
  id: string;
  texto: string;
  documento_id: string | null;
  documento_nombre: string | null;
  intencion: Intencion | null;
  area_juridica: AreaJuridica | null;
  terminos_detectados: string[];
  puntajes_por_area: Record<string, number>;
  fuentes: FuenteLegal[];
  respuesta: RespuestaJuridicaIA | null;
  etapa_ia: string | null;
  ia_error: string | null;
  estado: string;
  creada_en: string;
}

export interface ItemHistorial {
  id: string;
  texto: string;
  area_juridica: AreaJuridica | null;
  cantidad_fuentes: number;
  documento_nombre: string | null;
  creada_en: string;
}

export interface HistorialResponse {
  total: number;
  items: ItemHistorial[];
}
