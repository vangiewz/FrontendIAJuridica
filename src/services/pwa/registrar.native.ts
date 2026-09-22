export interface EstadoServiceWorker {
  soportado: boolean;
  hayActualizacion: boolean;
}

export async function registrarServiceWorker(alHaberActualizacion: () => void): Promise<void> {
  // No-op en nativo
}

export function aplicarActualizacion(): void {
  // No-op en nativo
}
