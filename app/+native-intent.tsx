/**
 * Enlaces que llegan del sistema, antes de que el router los convierta en una ruta.
 *
 * `expo-sharing` avisa de un archivo compartido con un enlace interno `esquema://expo-sharing`
 * para que la app se abra (o vuelva a primer plano). Ese enlace NO es una pantalla: si el router
 * lo tratara como ruta daría «pantalla no encontrada» y, con la llamada abierta, la sacaría de
 * ella (y cortaría su voz). Aquí se descarta: el archivo lo recoge `RecibidosProvider`, que lo
 * lleva a la llamada por su propio camino.
 */
export function redirectSystemPath({ path, initial }: { path: string; initial: boolean }): string {
  if (path.includes('expo-sharing')) {
    // Arranque en frío: empezar por la raíz de siempre. Con la app abierta: ignorar el enlace.
    return initial ? '/' : '';
  }
  return path;
}
