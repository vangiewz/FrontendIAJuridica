export type Visualizacion = 'tabla' | 'barras' | 'torta' | 'resumen';
export type Direccion = 'asc' | 'desc';
export type Operador =
  | 'igual' | 'distinto' | 'contiene' | 'mayor_que' | 'menor_que' | 'entre' | 'desde' | 'hasta';
export type FuncionAgregacion = 'conteo' | 'suma' | 'promedio' | 'minimo' | 'maximo';
/** Los unicos formatos que el backend sabe generar. */
export type FormatoExportacion = 'pdf' | 'docx' | 'xlsx' | 'pptx';
/** Lo que viaja en la especificacion: "" significa que no se pidio archivo. */
export type FormatoPedido = '' | FormatoExportacion;

export const FORMATOS: { formato: FormatoExportacion; etiqueta: string }[] = [
  { formato: 'pdf', etiqueta: 'PDF' },
  { formato: 'docx', etiqueta: 'Word' },
  { formato: 'xlsx', etiqueta: 'Excel' },
  { formato: 'pptx', etiqueta: 'PowerPoint' },
];

export interface FiltroReporte {
  campo: string;
  operador: Operador;
  valor: string;
  valor_hasta: string;
}

export interface OrdenReporte {
  campo: string;
  direccion: Direccion;
}

export interface AgregacionReporte {
  funcion: FuncionAgregacion;
  campo: string;
}

/**
 * La especificacion que interpreto el modelo. Se devuelve tal cual al backend cuando el
 * usuario pide un ajuste ("ahora mostralo como grafico"), para que el reporte siguiente
 * parta de este y no de cero. El backend la revalida igual: no es una via de confianza.
 */
export interface EspecificacionReporte {
  entidad: string;
  titulo: string;
  columnas: string[];
  filtros: FiltroReporte[];
  agrupacion: string[];
  agregaciones: AgregacionReporte[];
  orden: OrdenReporte[];
  visualizacion: Visualizacion;
  /** Formato de archivo pedido dentro de la misma frase; "" si no se pidio ninguno. */
  exportacion: FormatoPedido;
  limite: number;
  aclaracion: string;
}

export interface ColumnaReporte {
  clave: string;
  etiqueta: string;
  tipo: string;
}

export type ValorCelda = string | number | boolean | null;
export type FilaReporte = Record<string, ValorCelda>;

export interface ReporteResultado {
  titulo: string;
  entidad: string;
  entidad_etiqueta: string;
  visualizacion: Visualizacion;
  columnas: ColumnaReporte[];
  filas: FilaReporte[];
  total: number;
  filtros_aplicados: string[];
  avisos: string[];
  /** Ruta de detalle de la entidad; si viene, cada fila trae `_id` y se puede abrir. */
  ruta_detalle: string | null;
  especificacion: EspecificacionReporte;
  /** Si el usuario nombro un formato en su frase, la pantalla lanza esa descarga sola. */
  exportacion: FormatoPedido;
  /** La peticion original; queda registrada dentro de los archivos exportados. */
  peticion: string;
  interpretacion_ms: number;
  consulta_ms: number;
}

export const CLAVE_ID = '_id';

export function formatearValor(valor: ValorCelda, tipo: string): string {
  if (valor === null || valor === undefined || valor === '') return '—';
  if (tipo === 'fecha' && typeof valor === 'string') {
    const fecha = new Date(valor);
    if (!Number.isNaN(fecha.getTime())) {
      return fecha.toLocaleDateString('es-BO', {
        day: '2-digit', month: '2-digit', year: 'numeric',
      });
    }
  }
  if (typeof valor === 'number') return String(Math.round(valor * 100) / 100);
  return String(valor);
}

/** La primera columna no numerica sirve de etiqueta del grafico; la primera numerica, de valor. */
export function ejesDelGrafico(
  columnas: ColumnaReporte[],
): { etiqueta: ColumnaReporte; valor: ColumnaReporte } | null {
  const etiqueta = columnas.find((c) => c.tipo !== 'numero');
  const valor = columnas.find((c) => c.tipo === 'numero');
  if (!etiqueta || !valor) return null;
  return { etiqueta, valor };
}

export function aCsv(reporte: ReporteResultado): string {
  const escapar = (texto: string) => `"${texto.replace(/"/g, '""')}"`;
  const cabecera = reporte.columnas.map((c) => escapar(c.etiqueta)).join(';');
  const filas = reporte.filas.map((fila) =>
    reporte.columnas.map((c) => escapar(formatearValor(fila[c.clave], c.tipo))).join(';'),
  );
  return [cabecera, ...filas].join('\r\n');
}

// --- Catalogo: lo que el backend declara que se puede hacer ------------------------
// El constructor visual no tiene campos ni reglas escritos a mano; todo sale de aca.

export interface CampoCatalogo {
  clave: string;
  etiqueta: string;
  tipo: string;
  filtrable: boolean;
  ordenable: boolean;
  agrupable: boolean;
  agregable: boolean;
  /** Valores admitidos cuando el campo es un enumerado. */
  valores: string[];
  /** Operadores que el backend acepta de verdad para este campo. */
  operadores: Operador[];
}

export interface EntidadCatalogo {
  entidad: string;
  etiqueta: string;
  descripcion: string;
  columnas_por_defecto: string[];
  campos: CampoCatalogo[];
}

export interface Catalogo {
  entidades: EntidadCatalogo[];
  funciones: { clave: FuncionAgregacion; etiqueta: string }[];
  visualizaciones: { clave: Visualizacion; etiqueta: string }[];
  direcciones: { clave: Direccion; etiqueta: string }[];
  /** Expresiones de fecha que el backend sabe resolver; aca solo se muestran como ayuda. */
  expresiones_fecha: string[];
}

export function campoDe(entidad: EntidadCatalogo | undefined, clave: string) {
  return entidad?.campos.find((c) => c.clave === clave);
}

export function etiquetaDe(entidad: EntidadCatalogo | undefined, clave: string): string {
  return campoDe(entidad, clave)?.etiqueta ?? clave;
}

/** La especificacion vacia con la que arranca el constructor. */
export function especificacionVacia(entidad = ''): EspecificacionReporte {
  return {
    entidad,
    titulo: '',
    columnas: [],
    filtros: [],
    agrupacion: [],
    agregaciones: [],
    orden: [],
    visualizacion: 'tabla',
    exportacion: '',
    limite: 100,
    aclaracion: '',
  };
}
