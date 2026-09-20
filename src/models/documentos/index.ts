export type TipoDocumento =
  | 'compraventa' | 'arrendamiento' | 'prestamo'
  | 'acuerdo_civil' | 'otro';

export type EstadoProceso = 'pendiente' | 'procesando' | 'completado' | 'fallido';

/** Respuesta de POST /api/v1/documentos (DocumentoResponse en el backend). */
export interface Documento {
  id: string;
  nombre_archivo: string;
  tipo_documento: TipoDocumento | null;
  terminos_detectados: string[];
  cantidad_caracteres: number | null;
  estado: EstadoProceso;
  motivo_fallo: string | null;
  subido_en: string;
}

/** Archivo elegido en el selector, todavia sin enviar. */
export interface ArchivoSeleccionado {
  nombre: string;
  extension: string;
  tamano: number | null;      // bytes; el selector no siempre lo informa
  mimeType: string | null;
  uri: string;
  /** Solo en web: el File del navegador, que es lo que se adjunta al FormData. */
  archivoWeb?: File;
}

// Espejo de EXTENSIONES en app/services/documentos/extractor_documento.py y de
// TAMANO_MAXIMO en app/controllers/documentos/carga_controller.py. Se validan aca
// tambien para no gastar la subida de un archivo que el backend ya va a rechazar.
export const EXTENSIONES_PERMITIDAS: readonly string[] = ['.pdf', '.docx', '.txt'];
export const TAMANO_MAXIMO_BYTES = 10 * 1024 * 1024;

const ETIQUETAS_TIPO_DOCUMENTO: Record<TipoDocumento, string> = {
  compraventa: 'Compraventa',
  arrendamiento: 'Arrendamiento',
  prestamo: 'Préstamo',
  acuerdo_civil: 'Acuerdo civil',
  otro: 'Tipo no identificado específicamente',
};

/** Un dato reconocido en el texto, con la clausula donde aparecio. */
export interface Hallazgo {
  tipo: string; // 'monto_bs' | 'monto_usd' | 'fecha' | 'plazo' | 'cedula' | 'nit'
  texto: string;
  inicio: number;
  fin: number;
  clausula: number | null;
}

export interface Clausula {
  orden: number;
  encabezado: string;
  texto: string;
  inicio: number;
  fin: number;
}

/** Item de GET /api/v1/documentos: lo mínimo para elegir un documento ya cargado. */
export interface ItemDocumento {
  id: string;
  nombre_archivo: string;
  tipo_documento: TipoDocumento | null;
  estado: EstadoProceso;
  subido_en: string;
}

export interface DocumentosResponse {
  total: number;
  items: ItemDocumento[];
}

/** GET /api/v1/documentos/{id}: el documento con su texto extraído. */
export interface DocumentoDetalle extends Documento {
  texto_extraido: string | null;
}

/** Fila del historial de comparaciones (GET /api/v1/documentos/comparaciones). */
export interface ItemComparacion {
  id: string;
  documento_a_id: string;
  documento_b_id: string;
  nombre_a: string;
  nombre_b: string;
  estrategia: string;
  cantidad_cambios: number;
  creada_en: string;
}

export interface ComparacionesResponse {
  total: number;
  items: ItemComparacion[];
}

export type TipoDiferencia = 'agregado' | 'eliminado' | 'modificado';

export interface Diferencia {
  tipo: TipoDiferencia;
  ubicacion: string;
  texto_anterior: string | null;
  texto_nuevo: string | null;
  explicacion: string;
  clausula: number | null;
}

/** Respuesta de POST /api/v1/documentos/comparaciones. */
export interface Comparacion {
  id: string;
  documento_a_id: string;
  documento_b_id: string;
  nombre_a: string;
  nombre_b: string;
  estrategia: string; // 'clausulas' | 'texto'
  cantidad_cambios: number;
  diferencias: Diferencia[];
  creada_en: string;
}

const ETIQUETAS_DIFERENCIA: Record<TipoDiferencia, string> = {
  agregado: 'AGREGADO',
  eliminado: 'ELIMINADO',
  modificado: 'MODIFICADO',
};

export function etiquetaDiferencia(tipo: TipoDiferencia): string {
  return ETIQUETAS_DIFERENCIA[tipo] ?? tipo.toUpperCase();
}

/** Solo los documentos que el backend puede comparar: los que tienen texto extraído. */
export function esComparable(documento: ItemDocumento): boolean {
  return documento.estado === 'completado';
}

/** Norma real que la IA recibio para redactar; se puede abrir y leer completa. */
export interface FuenteAnalisis {
  id: string;
  codigo: string;
  numero_articulo: number;
  articulo: string;
  epigrafe: string | null;
  texto: string;
}

export type SeveridadRiesgo = 'alta' | 'media' | 'baja';

/** Un riesgo detectado por el motor de reglas (RiesgoResponse del backend). */
export interface Riesgo {
  /** Viene del backend: separa lo determinista de lo redactado por el modelo. */
  origen: 'reglas';
  codigo_regla: string;
  titulo: string;
  severidad: SeveridadRiesgo;
  articulos: number[];
  explicacion: string;
  evidencia: string | null;
  inicio: number | null;
  clausula: number | null;
}

/**
 * Observacion redactada por la IA sobre una clausula concreta del contrato.
 * `evidencia` es un fragmento literal del documento: el backend rechaza la
 * observacion si no aparece tal cual en el texto analizado.
 */
export interface ObservacionIA {
  origen: 'ia';
  observacion: string;
  evidencia: string;
  norma_id: string | null;
}

/**
 * Respuesta de POST /api/v1/documentos/{id}/analisis.
 *
 * `riesgos` sale del motor determinista y `resumen`/`observaciones` de la IA local.
 * Se muestran en bloques distintos a proposito: un texto generado no puede pasar
 * por un hallazgo de las reglas.
 */
export interface Analisis {
  id: string;
  documento_id: string;
  tipo_documento: TipoDocumento;
  clausulas: Clausula[];
  hallazgos: Hallazgo[];
  parrafo_partes: string | null;
  riesgos: Riesgo[];
  reglas_evaluadas: number;
  resumen: string | null;
  observaciones: ObservacionIA[];
  fuentes_ia: FuenteAnalisis[];
  ia_error: string | null;
  creado_en: string;
}

// Solo se traduce el valor a como se lee en pantalla. El orden y el significado
// los define el backend: motor_riesgos.analizar() ya devuelve los riesgos
// ordenados por severidad y posicion, y la UI los muestra en ese orden.
const ETIQUETAS_SEVERIDAD: Record<SeveridadRiesgo, string> = {
  alta: 'ALTA',
  media: 'MEDIA',
  baja: 'BAJA',
};

export function etiquetaSeveridad(severidad: SeveridadRiesgo): string {
  return ETIQUETAS_SEVERIDAD[severidad] ?? severidad.toUpperCase();
}

/** Cuenta por severidad, en el orden en que se muestran. Las que no aparecen se omiten. */
export function resumirSeveridades(riesgos: Riesgo[]): { severidad: SeveridadRiesgo; total: number }[] {
  const orden: SeveridadRiesgo[] = ['alta', 'media', 'baja'];
  return orden
    .map((severidad) => ({
      severidad,
      total: riesgos.filter((r) => r.severidad === severidad).length,
    }))
    .filter((item) => item.total > 0);
}

export interface GrupoHallazgos {
  titulo: string;
  items: Hallazgo[];
}

// Los tipos son los que emite extractor_entidades.py. Se agrupan por lo que significan
// para quien lee, no uno por tipo: monto_bs y monto_usd son ambos "montos".
const GRUPOS: ReadonlyArray<{ titulo: string; tipos: readonly string[] }> = [
  { titulo: 'Fechas', tipos: ['fecha'] },
  { titulo: 'Montos', tipos: ['monto_bs', 'monto_usd'] },
  { titulo: 'Plazos', tipos: ['plazo'] },
  { titulo: 'Documentos de identidad', tipos: ['cedula', 'nit'] },
];

/** Agrupa los hallazgos para mostrarlos. Los grupos sin nada no se devuelven. */
export function agruparHallazgos(hallazgos: Hallazgo[]): GrupoHallazgos[] {
  return GRUPOS
    .map(({ titulo, tipos }) => ({
      titulo,
      items: hallazgos.filter((h) => tipos.includes(h.tipo)),
    }))
    .filter((grupo) => grupo.items.length > 0);
}

// Los tipos a los que motor_riesgos.analizar() suma un set de reglas propio, ademas
// de las comunes. `acuerdo_civil` es un documento civil soportado pero solo recibe
// las reglas comunes, y `otro` no se reconocio como contrato.
const TIPOS_CON_REGLAS_PROPIAS: readonly string[] = ['compraventa', 'arrendamiento', 'prestamo'];

export function tieneReglasPropias(tipo: TipoDocumento): boolean {
  return TIPOS_CON_REGLAS_PROPIAS.includes(tipo);
}

/** Cuantos datos juridicos cayeron dentro de una clausula, segun los hallazgos del backend. */
export function contarDatosEnClausula(analisis: Analisis, orden: number): number {
  return analisis.hallazgos.filter((h) => h.clausula === orden).length;
}

export function tieneInformacionExtraida(analisis: Analisis): boolean {
  return (
    analisis.hallazgos.length > 0 ||
    analisis.clausulas.length > 0 ||
    (analisis.parrafo_partes !== null && analisis.parrafo_partes.trim().length > 0)
  );
}

export interface TipoDocumentoDescrito {
  etiqueta: string;
  /** false para `otro` y para null: el backend no se comprometio con un tipo. */
  identificado: boolean;
}

/**
 * Como se muestra el tipo que asigno el backend.
 *
 * `otro` es una decision real del clasificador: ningun tipo llego al umbral
 * (UMBRAL_MINIMO_TIPO en clasificador_documental.py). `null` es distinto: el
 * documento fallo antes de clasificarse. Ninguno de los dos se rellena con una
 * categoria inventada.
 */
export function describirTipoDocumento(tipo: TipoDocumento | null): TipoDocumentoDescrito {
  if (tipo === null) {
    return { etiqueta: 'Sin clasificar', identificado: false };
  }
  return { etiqueta: ETIQUETAS_TIPO_DOCUMENTO[tipo], identificado: tipo !== 'otro' };
}

export function formatearTamano(bytes: number | null): string | null {
  if (bytes === null) return null;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
