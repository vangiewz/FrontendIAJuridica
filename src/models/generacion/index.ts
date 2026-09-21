import { TipoDocumento } from '../documentos';

/** Los tres tipos dentro del alcance de generacion los declara el backend. */
export interface CampoPlantilla {
  clave: string;
  etiqueta: string;
  obligatorio: boolean;
}

export interface Plantilla {
  tipo_documento: TipoDocumento;
  titulo: string;
  campos: CampoPlantilla[];
  clausulas: string[];
}

export interface FuenteGeneracion {
  id: string;
  codigo: string;
  numero_articulo: number;
  articulo: string;
  texto: string;
}

/**
 * Un borrador guardado. `campos_faltantes` son los datos que el documento dejo
 * marcados como [FALTA: ...]: el sistema no los completa por su cuenta.
 */
export interface DocumentoGenerado {
  id: string;
  tipo_documento: TipoDocumento;
  contenido: string;
  version: number;
  documento_padre_id: string | null;
  campos_faltantes: string[];
  fuentes: FuenteGeneracion[];
  ia_error: string | null;
  creado_en: string;
}

/** Los unicos formatos en que se puede bajar un borrador. */
export type FormatoBorrador = 'docx' | 'pdf';

export const FORMATOS_BORRADOR: { formato: FormatoBorrador; etiqueta: string }[] = [
  { formato: 'docx', etiqueta: 'Word' },
  { formato: 'pdf', etiqueta: 'PDF' },
];

export interface VersionResumen {
  id: string;
  version: number;
  documento_padre_id: string | null;
  creado_en: string;
}

/** Un dato que la IA reconocio en el texto, con el fragmento del que salio. */
export interface DatoDetectado {
  campo: string;
  etiqueta: string;
  valor: string;
  evidencia: string;
}

/**
 * Un dato del texto que choca con uno que ya estaba cargado. El backend nunca lo
 * aplica solo: lo devuelve para que el usuario decida.
 */
export interface ConflictoDato {
  campo: string;
  etiqueta: string;
  valor_actual: string;
  valor_detectado: string;
  evidencia: string;
  /** True cuando la frase pedia el cambio expresamente ("cambia el precio a..."). */
  explicito: boolean;
}

export interface CampoPendiente {
  clave: string;
  etiqueta: string;
  obligatorio: boolean;
}

export interface InterpretacionResponse {
  tipo_documento: TipoDocumento | null;
  /** El formulario ya combinado: lo que habia mas lo detectado sin conflicto. */
  datos: Record<string, string>;
  detectados: DatoDetectado[];
  conflictos: ConflictoDato[];
  campos_pendientes: CampoPendiente[];
  /** Campos que la IA propuso pero no estaban en el texto; se descartaron. */
  descartados: string[];
  requiere_tipo: boolean;
  mensaje: string;
}
