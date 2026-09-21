/**
 * A qué paso corresponde la etapa que informa el servidor, o -1 si no es una de las del
 * análisis normativo (leer un documento, por ejemplo, no tiene estos pasos).
 * Es un indicador de ETAPA, no de porcentaje: redactar es con diferencia lo más largo.
 */
export function pasoDeEtapa(etapa: string | null): number {
  const e = (etapa ?? '').toLowerCase();
  if (/^(preparando|buscando normativa)/.test(e)) return 0;
  if (e.startsWith('analizando fuentes')) return 1;
  if (e.startsWith('generando respuesta')) return 2;
  if (/^validando/.test(e)) return 3;
  return -1;
}
