export interface AlmacenClaveValor {
  getItem(clave: string): Promise<string | null>;
  setItem(clave: string, valor: string): Promise<void>;
  removeItem(clave: string): Promise<void>;
}

