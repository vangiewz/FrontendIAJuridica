import { AreaJuridica, EstadoVigencia } from '../consultas';

export interface ArticuloCorpus {
  id: string;
  codigo: string;
  articulo: string;
  numero_articulo: number;
  epigrafe: string | null;
  texto: string;
  area_juridica: AreaJuridica | null;
  ubicacion: { libro: string | null; parte: string | null; titulo: string | null;
               capitulo: string | null; seccion: string | null };
  estado_vigencia: EstadoVigencia;
  nota_vigencia: string | null;
  fuente_nombre: string;
  fuente_url: string;
  version: number;
}
export interface VersionCorpus { codigo: string; version: string; cantidad: number; generada_en: string }
export interface PaginaCorpus { codigo: string; version: string; total: number; desde: number; articulos: ArticuloCorpus[] }

export function armarDetalleLocal(local: ArticuloCorpus, anterior: number | null, siguiente: number | null) {
  return {
    id: local.id, codigo: local.codigo, articulo: local.articulo,
    numero_articulo: local.numero_articulo, epigrafe: local.epigrafe,
    texto: local.texto, area_juridica: local.area_juridica,
    ubicacion: local.ubicacion, anterior, siguiente,
    estado_vigencia: local.estado_vigencia, nota_vigencia: local.nota_vigencia,
    fuente_nombre: local.fuente_nombre, fuente_url: local.fuente_url
  };
}

export function vecinosPuros(numero: number, disponibles: number[]) {
  const nums = disponibles.slice().sort((a, b) => a - b);
  const idx = nums.indexOf(numero);
  if (idx === -1) return { anterior: null, siguiente: null };
  return {
    anterior: idx > 0 ? nums[idx - 1] : null,
    siguiente: idx < nums.length - 1 ? nums[idx + 1] : null,
  };
}
