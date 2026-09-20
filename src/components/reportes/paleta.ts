import { colores } from '../../theme';

/**
 * Colores de serie para los graficos. Salen del tema, no de una paleta nueva: un
 * reporte tiene que parecerse al resto de la aplicacion.
 */
export const PALETA = [
  colores.accion,
  colores.areas.contratos,
  colores.destacado,
  colores.areas.obligaciones,
  colores.areas.sucesiones,
  colores.areas.derechosReales,
  colores.alerta,
  colores.tintaSuave,
] as const;

export function colorDeSerie(indice: number): string {
  return PALETA[indice % PALETA.length];
}
