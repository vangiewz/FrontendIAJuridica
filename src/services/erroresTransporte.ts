export function esErrorDeTransporte(e: unknown): boolean {
  if (!e || typeof e !== 'object') return false;
  const codigo = (e as any).codigo;
  return codigo === 'SIN_CONEXION' || codigo === 'TIEMPO_AGOTADO';
}
