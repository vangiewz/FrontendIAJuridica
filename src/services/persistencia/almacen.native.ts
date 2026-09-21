import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AlmacenClaveValor } from './almacen';

export const almacen: AlmacenClaveValor = {
  getItem: async (clave) => {
    try {
      return await AsyncStorage.getItem(clave);
    } catch (e) {
      console.warn('Error leyendo de AsyncStorage', e);
      return null;
    }
  },
  setItem: async (clave, valor) => {
    try {
      await AsyncStorage.setItem(clave, valor);
    } catch (e) {
      console.warn('Error escribiendo en AsyncStorage', e);
    }
  },
  removeItem: async (clave) => {
    try {
      await AsyncStorage.removeItem(clave);
    } catch (e) {
      console.warn('Error borrando en AsyncStorage', e);
    }
  }
};
