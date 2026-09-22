export const TOPE_INTENTOS = 8;

export function proximoIntento(intentos: number, ahora: number, aleatorio: number): number {
  const delayBase = Math.min(30_000 * Math.pow(2, intentos), 1_800_000);
  const jitter = delayBase * 0.2 * ((aleatorio * 2) - 1);
  return Math.round(ahora + delayBase + jitter);
}
