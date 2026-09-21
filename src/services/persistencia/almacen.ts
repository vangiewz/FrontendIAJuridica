export interface AlmacenClaveValor {
  getItem(clave: string): Promise<string | null>;
  setItem(clave: string, valor: string): Promise<void>;
  removeItem(clave: string): Promise<void>;
}

/**
 * La implementacion la elige Metro por extension: `almacen.web.ts` o `almacen.native.ts`.
 * Este `declare` no emite nada en runtime —este archivo nunca se carga, siempre gana uno
 * de los dos— y es lo que le da a TypeScript el tipo del simbolo que va a resolverse.
 * Sin el, todo consumidor necesita un `@ts-ignore`, que es peor: apaga la comprobacion
 * entera de esa linea, no solo la resolucion del modulo.
 */
export declare const almacen: AlmacenClaveValor;

