import { peticion } from './api';
import { ArticuloDetalle, ExplicacionArticulo } from '../models/normativa';

export async function obtenerArticulo(codigo: string, numero: number): Promise<ArticuloDetalle> {
  return peticion<ArticuloDetalle>(`/api/v1/normativa/articulos/${encodeURIComponent(codigo)}/${numero}`);
}

/**
 * HU-13: explicacion en lenguaje sencillo del articulo. Se pide bajo demanda porque
 * la genera el modelo local y tarda varios segundos.
 */
export async function explicarArticulo(codigo: string, numero: number): Promise<ExplicacionArticulo> {
  return peticion<ExplicacionArticulo>(
    `/api/v1/normativa/articulos/${encodeURIComponent(codigo)}/${numero}/explicacion`,
  );
}
