import * as FileSystem from 'expo-file-system/legacy';
import { ArticuloCorpus } from '../../models/normativa/corpus';
import type { RepositorioCorpus } from './repositorio';
import { almacen } from '../persistencia/almacen';

interface MetaCorpus {
  version: string;
  guardados: number;
  total: number;
  completo: boolean;
  paginasGuardadas: number;
}

interface IndiceArticulos {
  [numero: number]: number; // map articulo.numero_articulo -> pagina index
}

const dirBase = `${FileSystem.documentDirectory}corpus`;

const uriPagina = (codigo: string, pagina: number) => `${dirBase}/${codigo}/pagina_${pagina}.json`;

async function asegurarDirectorio(codigo: string) {
  const info = await FileSystem.getInfoAsync(`${dirBase}/${codigo}`);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(`${dirBase}/${codigo}`, { intermediates: true });
  }
}

async function getMeta(codigo: string): Promise<MetaCorpus | null> {
  const json = await almacen.getItem(`corpus_meta_${codigo}`);
  return json ? JSON.parse(json) : null;
}

async function saveMeta(codigo: string, meta: MetaCorpus) {
  await almacen.setItem(`corpus_meta_${codigo}`, JSON.stringify(meta));
}

async function getIndice(codigo: string): Promise<IndiceArticulos> {
  const json = await almacen.getItem(`corpus_indice_${codigo}`);
  return json ? JSON.parse(json) : {};
}

async function saveIndice(codigo: string, indice: IndiceArticulos) {
  await almacen.setItem(`corpus_indice_${codigo}`, JSON.stringify(indice));
}

export const repositorio: RepositorioCorpus = {
  async versionGuardada(codigo) {
    const meta = await getMeta(codigo);
    return meta ? meta.version : null;
  },
  async guardarPagina(codigo, version, articulos) {
    await asegurarDirectorio(codigo);
    const meta = await getMeta(codigo) || { version, guardados: 0, total: 0, completo: false, paginasGuardadas: 0 };
    const indice = await getIndice(codigo);
    
    const numPagina = meta.paginasGuardadas;
    const path = uriPagina(codigo, numPagina);
    await FileSystem.writeAsStringAsync(path, JSON.stringify(articulos));
    
    for (const art of articulos) {
      indice[art.numero_articulo] = numPagina;
    }
    
    meta.paginasGuardadas += 1;
    meta.guardados += articulos.length;
    
    await saveMeta(codigo, meta);
    await saveIndice(codigo, indice);
  },
  async marcarCompleto(codigo, version, total) {
    const meta = await getMeta(codigo) || { version, guardados: total, total, completo: false, paginasGuardadas: 0 };
    meta.completo = true;
    meta.total = total;
    await saveMeta(codigo, meta);
  },
  async estaCompleto(codigo) {
    const meta = await getMeta(codigo);
    return meta ? !!meta.completo : false;
  },
  async leerArticulo(codigo, numero) {
    const indice = await getIndice(codigo);
    const pag = indice[numero];
    if (pag === undefined) return null;
    
    const path = uriPagina(codigo, pag);
    try {
      const txt = await FileSystem.readAsStringAsync(path);
      const articulos: ArticuloCorpus[] = JSON.parse(txt);
      return articulos.find(a => a.numero_articulo === numero) ?? null;
    } catch {
      return null;
    }
  },
  async vecinos(codigo, numero) {
    const indice = await getIndice(codigo);
    const nums = Object.keys(indice).map(Number).sort((a, b) => a - b);
    const idx = nums.indexOf(numero);
    if (idx === -1) return { anterior: null, siguiente: null };
    return {
      anterior: idx > 0 ? nums[idx - 1] : null,
      siguiente: idx < nums.length - 1 ? nums[idx + 1] : null,
    };
  },
  async limpiar(codigo) {
    try {
      await FileSystem.deleteAsync(`${dirBase}/${codigo}`, { idempotent: true });
    } catch (e) {
      // Ignorar
    }
    await almacen.removeItem(`corpus_meta_${codigo}`);
    await almacen.removeItem(`corpus_indice_${codigo}`);
  },
  async progreso(codigo) {
    const meta = await getMeta(codigo);
    if (!meta) return { guardados: 0, total: 0 };
    return { guardados: meta.guardados, total: meta.total };
  }
};
