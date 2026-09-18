import { peticion } from './api';
import { ArticuloDetalle } from '../models/normativa';

export async function obtenerArticulo(codigo: string, numero: number): Promise<ArticuloDetalle> {
  return peticion<ArticuloDetalle>(`/api/v1/normativa/articulos/${encodeURIComponent(codigo)}/${numero}`);
}
