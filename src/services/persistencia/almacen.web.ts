import { get, set, del, createStore } from 'idb-keyval';
import type { AlmacenClaveValor } from './almacen';

const customStore = createStore('juridica-cache', 'keyval');

export const almacen: AlmacenClaveValor = {
  getItem: async (clave) => {
    try {
      const val = await get(clave, customStore);
      return val ?? null;
    } catch (e) {
      console.warn('Error leyendo de idb-keyval', e);
      return null;
    }
  },
  setItem: async (clave, valor) => {
    try {
      await set(clave, valor, customStore);
    } catch (e) {
      console.warn('Error escribiendo en idb-keyval', e);
    }
  },
  removeItem: async (clave) => {
    try {
      await del(clave, customStore);
    } catch (e) {
      console.warn('Error borrando en idb-keyval', e);
    }
  }
};
