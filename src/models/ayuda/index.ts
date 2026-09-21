export type PantallaAyuda = 'asistente' | 'generar' | 'reportes' | 'documentos'
  | 'comparaciones' | 'historial' | 'general';
export type DestinoAyuda = Exclude<PantallaAyuda, 'general'>;
export type TipoDocumentoAyuda = 'compraventa' | 'arrendamiento' | 'prestamo';

export interface CampoAyuda {
  etiqueta: string;
  descripcion: string;
  obligatorio: boolean;
  destacado: boolean;
}

export interface CatalogoAyuda {
  id: PantallaAyuda;
  titulo: string;
  descripcion: string;
  pasos: string[];
  capacidades: string[];
  acciones: Record<string, string>;
  botones: Record<string, string>;
  campos: Record<string, CampoAyuda>;
  faq: { pregunta: string; respuesta: string; referencia: string }[];
  sugerencias: string[];
}

export interface TurnoAyuda {
  pregunta: string;
  respuesta: string;
}

export interface RespuestaAyuda {
  respuesta: string;
  tipo: 'ayuda' | 'redirigir_juridico' | 'fuera_alcance';
  accion_sugerida: { tipo: 'navegar'; destino: DestinoAyuda } | null;
  elemento_relacionado: string | null;
}

export interface MensajeAyuda {
  id: string;
  rol: 'usuario' | 'ayuda';
  texto: string;
  respuesta?: RespuestaAyuda;
}
