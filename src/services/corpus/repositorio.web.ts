import { get, set, del, createStore, keys } from 'idb-keyval';
import { ArticuloCorpus } from '../../models/normativa/corpus';
import type { RepositorioCorpus } from './repositorio';

const store = createStore('corpus-normativa', 'keyval');

interface MetaCorpus {
  version: string;
  guardados: number;
  total: number;
  completo: boolean;
}

export const repositorio: RepositorioCorpus = {
  async versionGuardada(codigo) {
    const meta = await get<MetaCorpus>(`meta#${codigo}`, store);
    return meta ? meta.version : null;
  },
  async guardarPagina(codigo, version, articulos) {
    for (const art of articulos) {
      await set(`${codigo}#${art.numero_articulo}`, art, store);
    }
    const meta = await get<MetaCorpus>(`meta#${codigo}`, store) || { version, guardados: 0, total: 0, completo: false };
    meta.guardados = (meta.guardados || 0) + articulos.length;
    await set(`meta#${codigo}`, meta, store);
  },
  async marcarCompleto(codigo, version, total) {
    const meta = await get<MetaCorpus>(`meta#${codigo}`, store) || { version, guardados: total, total, completo: false };
    meta.completo = true;
    meta.total = total;
    await set(`meta#${codigo}`, meta, store);
  },
  async estaCompleto(codigo) {
    const meta = await get<MetaCorpus>(`meta#${codigo}`, store);
    return meta ? !!meta.completo : false;
  },
  async leerArticulo(codigo, numero) {
    const art = await get<ArticuloCorpus>(`${codigo}#${numero}`, store);
    return art ?? null;
  },
  async vecinos(codigo, numero) {
    const allKeys = await keys(store);
    const nums = allKeys
      .filter(k => typeof k === 'string' && k.startsWith(`${codigo}#`))
      .map(k => parseInt((k as string).split('#')[1], 10))
      .filter(n => !isNaN(n))
      .sort((a, b) => a - b);
    
    const idx = nums.indexOf(numero);
    if (idx === -1) return { anterior: null, siguiente: null };
    return {
      anterior: idx > 0 ? nums[idx - 1] : null,
      siguiente: idx < nums.length - 1 ? nums[idx + 1] : null,
    };
  },
  async limpiar(codigo) {
    const allKeys = await keys(store);
    for (const k of allKeys) {
      if (typeof k === 'string' && (k.startsWith(`${codigo}#`) || k === `meta#${codigo}`)) {
        await del(k, store);
      }
    }
  },
  async progreso(codigo) {
    const meta = await get<MetaCorpus>(`meta#${codigo}`, store);
    if (!meta) return { guardados: 0, total: 0 };
    return { guardados: meta.guardados, total: meta.total };
  }
};
