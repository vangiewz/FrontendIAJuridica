import { TipoDocumento } from '../documentos';
import { CampoPendiente } from '../generacion';

/**
 * Lo que la llamada puede mostrar en su panel. Es una unión cerrada: agregar una vista
 * nueva es agregar una variante aquí y su contenido en `components/llamada`.
 *
 * Las variantes NO llevan los datos (la respuesta, el análisis, la comparación…): esos
 * viven en el controlador de la llamada, que es la fuente de verdad de la sesión. Así
 * cerrar o cambiar de panel nunca destruye nada, y un panel abierto se actualiza solo si
 * el dato que muestra cambia.
 */
export type ContenidoPanel =
  | { tipo: 'respuesta' }
  | { tipo: 'articulo'; codigo: string; numero: number }
  | { tipo: 'archivo'; para: DestinoArchivo }
  | { tipo: 'documento' }
  | { tipo: 'comparacion' }
  | { tipo: 'borrador' }
  | { tipo: 'documento_generado' }
  | { tipo: 'reporte' }
  /** Escaneo con cámara: progreso del OCR y, al terminar, la vista previa (páginas y texto). */
  | { tipo: 'escaneo' }
  /** El texto reconocido completo, con sus marcas de página (subnivel del escaneo). */
  | { tipo: 'texto_ocr' }
  /** Una cláusula fotografiada: su texto y qué hacer con él. */
  | { tipo: 'clausula' }
  /** Un archivo (o varios) compartido desde otra app: se muestra y el usuario decide. */
  | { tipo: 'recibido' }
  /** Un recordatorio: la propuesta a confirmar, la cancelación a confirmar, o su detalle. */
  | { tipo: 'recordatorio' }
  /** La lista de recordatorios de este teléfono. */
  | { tipo: 'recordatorios' }
  | { tipo: 'error'; mensaje: string; puedeReintentar: boolean };

export type TipoPanel = ContenidoPanel['tipo'];

/** Para qué se elige el archivo: el documento activo o uno de los dos a comparar. */
export type DestinoArchivo = 'documento' | 'comparar_a' | 'comparar_b';

/** Media pantalla, casi pantalla completa, o solo la barra (la llamada queda a la vista). */
export type TamanoPanel = 'minimizado' | 'medio' | 'expandido';

/** Lo mínimo de un documento para mostrarlo como contexto de la llamada. */
export interface FichaDocumento {
  id: string;
  nombre: string;
  tipo: TipoDocumento | null;
  estado: string;
  /** Vino de la cámara: cuántas páginas se escanearon. Nada más cambia: es un documento como cualquiera. */
  escaneado?: { paginas: number };
}

/** Una operación larga en curso: el avatar «piensa» y la pantalla dice qué se está haciendo. */
export type TipoOperacion =
  | 'subiendo' | 'analizando' | 'comparando' | 'interpretando' | 'generando' | 'revisando' | 'reporte'
  | 'reconociendo';

export interface Operacion {
  tipo: TipoOperacion;
  /** Lo que se ve en pantalla. Solo dice qué se hace: no hay porcentajes inventados. */
  texto: string;
  iniciadoEn: number;
}

/** La generación de un documento por voz: lo reunido hasta ahora y lo que falta preguntar. */
export interface BorradorEnCurso {
  tipo: TipoDocumento | null;
  datos: Record<string, string>;
  pendientes: CampoPendiente[];
  /** El campo que se acaba de preguntar; la próxima frase del usuario es su valor. */
  preguntando: CampoPendiente | null;
  /** Campos que el usuario prefirió dejar pendientes: se marcan [FALTA: …] en el borrador. */
  omitidos: string[];
  /** Ya se hizo la primera pregunta (la primera lleva la explicación de cómo seguir). */
  yaPregunto: boolean;
}

export const TEXTO_OPERACION: Record<TipoOperacion, string> = {
  subiendo: 'Subiendo el documento…',
  analizando: 'Estoy analizando el documento…',
  comparando: 'Comparando los documentos…',
  interpretando: 'Entendiendo lo que necesitas…',
  generando: 'Redactando el documento…',
  revisando: 'Aplicando el cambio al documento…',
  reporte: 'Preparando el reporte…',
  reconociendo: 'Reconociendo el texto…',
};

/** Cómo corre una operación larga: qué decir si falla y cómo reintentarla. */
export interface OpcionesOperacion {
  prefijoError: string;
  alReintentar: () => void;
  mapear?: (error: unknown) => string;
}

/** Lo que acompaña a un archivo subido desde la llamada cuando no salió de «Archivos». */
export interface ExtraSubida {
  /** Vino de la cámara: cuántas páginas tenía. */
  escaneado?: { paginas: number };
  /** Se llama solo si TODO salió bien (subida y análisis): ya se pueden borrar los temporales. */
  alExito?: () => void;
}

/** Estado del permiso de la cámara dentro del escáner. */
export type PermisoEscaner = 'verificando' | 'ok' | 'denegado' | 'denegado_definitivo' | 'no_disponible';
export type ModoEscaner = 'documento' | 'clausula';
