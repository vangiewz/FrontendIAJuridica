import { peticion } from '../api';
import { VersionCorpus, PaginaCorpus } from '../../models/normativa/corpus';

export function obtenerVersionCorpus(codigo: string): Promise<VersionCorpus> {
  return peticion(`/conocimiento/corpus/${encodeURIComponent(codigo)}/version`);
}

export function obtenerPaginaCorpus(codigo: string, desde: number, limite: number): Promise<PaginaCorpus> {
  return peticion(`/conocimiento/corpus/${encodeURIComponent(codigo)}?desde=${desde}&limite=${limite}`, {
    timeoutMs: 30000,
  });
}
