import { BASE_URL } from './baseUrl';

const TIEMPO_MS = 6000;

/**
 * ¿Responde el backend? Usa el endpoint de salud, que es liviano y no necesita sesión.
 * Nunca lanza: devuelve false ante cualquier fallo (sin red, fuera de la LAN, servidor
 * apagado o escuchando solo en 127.0.0.1).
 */
export async function verificarServidor(): Promise<boolean> {
  const controlador = new AbortController();
  const reloj = setTimeout(() => controlador.abort(), TIEMPO_MS);
  try {
    const res = await fetch(`${BASE_URL}/api/v1/health`, { signal: controlador.signal });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(reloj);
  }
}
