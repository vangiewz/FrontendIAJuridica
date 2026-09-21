import { peticion } from './api';
import { Consulta, ItemHistorial, HistorialResponse } from '../models/consultas';

export async function crearConsulta(texto: string): Promise<string> {
  const data = await peticion<{ id: string }>('/api/v1/consultas', {
    method: 'POST',
    body: JSON.stringify({ texto }),
  });
  return data.id;
}

/**
 * Arranca la consulta y devuelve el id de inmediato. El modelo local puede tardar
 * decenas de segundos, asi que la pantalla sigue el avance con obtenerConsulta.
 */
// Tiempos por LLAMADA, no por procesamiento: arrancar y leer el avance son respuestas
// inmediatas aunque el modelo tarde minutos en contestar.
const TIEMPO_INICIAR_MS = 30000;
const TIEMPO_AVANCE_MS = 20000;

export async function iniciarConsulta(
  texto: string,
  documentoId?: string | null,
): Promise<string> {
  const data = await peticion<{ id: string }>('/api/v1/consultas/iniciar', {
    method: 'POST',
    // El documento activo viaja como contexto. El backend comprueba que sea del
    // usuario antes de usarlo, asi que mandarlo no es una via de confianza.
    body: JSON.stringify({ texto, documento_id: documentoId ?? null }),
    timeoutMs: TIEMPO_INICIAR_MS,
  });
  return data.id;
}

export async function obtenerConsulta(id: string): Promise<Consulta> {
  return peticion<Consulta>(`/api/v1/consultas/${id}`, { timeoutMs: TIEMPO_AVANCE_MS });
}

export async function listarHistorial(): Promise<ItemHistorial[]> {
  // El endpoint devuelve { total, items }, no un arreglo plano. Tipar el generico como
  // ItemHistorial[] no falla en compilacion —`peticion` castea— pero revienta en pantalla
  // con "historial.map is not a function".
  const data = await peticion<HistorialResponse>('/api/v1/consultas/historial');
  return data.items;
}
