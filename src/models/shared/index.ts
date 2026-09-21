export interface ApiError {
  mensaje: string;
  codigo: string;
  estado: number;
  /** Lo que el servidor mandó como `detail` cuando no era un texto (p. ej. los campos a corregir). */
  detalle?: unknown;
}
