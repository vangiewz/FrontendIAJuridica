import { ArticuloCorpus } from '../../models/normativa/corpus';

export interface RepositorioCorpus {
  versionGuardada(codigo: string): Promise<string | null>;
  guardarPagina(codigo: string, version: string, articulos: ArticuloCorpus[]): Promise<void>;
  marcarCompleto(codigo: string, version: string, total: number): Promise<void>;
  estaCompleto(codigo: string): Promise<boolean>;
  leerArticulo(codigo: string, numero: number): Promise<ArticuloCorpus | null>;
  vecinos(codigo: string, numero: number): Promise<{ anterior: number | null; siguiente: number | null }>;
  limpiar(codigo: string): Promise<void>;
  progreso(codigo: string): Promise<{ guardados: number; total: number }>;
}

export declare const repositorio: RepositorioCorpus;
