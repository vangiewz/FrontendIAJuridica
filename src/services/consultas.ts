import { peticion } from './api';
import { Consulta, ItemHistorial, HistorialResponse } from '../models/consultas';

export async function crearConsulta(texto: string): Promise<string> {
  const data = await peticion<{ id: string }>('/api/v1/consultas', {
    method: 'POST',
    body: JSON.stringify({ texto }),
  });
  return data.id;
}

export async function obtenerConsulta(id: string): Promise<Consulta> {
  return peticion<Consulta>(`/api/v1/consultas/${id}`);
}

export async function listarHistorial(): Promise<ItemHistorial[]> {
  // El endpoint devuelve { total, items }, no un arreglo plano. Tipar el generico como
  // ItemHistorial[] no falla en compilacion —`peticion` castea— pero revienta en pantalla
  // con "historial.map is not a function".
  const data = await peticion<HistorialResponse>('/api/v1/consultas/historial');
  return data.items;
}
