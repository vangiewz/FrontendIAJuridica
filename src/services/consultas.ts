import { peticion } from './api';
import { Consulta, ItemHistorial } from '../models/consultas';

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
  return peticion<ItemHistorial[]>('/api/v1/consultas/historial');
}
