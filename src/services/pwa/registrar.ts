export interface EstadoServiceWorker {
  soportado: boolean;
  hayActualizacion: boolean;
}

export declare function registrarServiceWorker(alHaberActualizacion: () => void): Promise<void>;
export declare function aplicarActualizacion(): void;
