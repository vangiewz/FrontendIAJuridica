export interface EstadoServiceWorker {
  soportado: boolean;
  hayActualizacion: boolean;
}

let onUpdate: (() => void) | null = null;
let registrando = false;
let swRegistration: ServiceWorkerRegistration | null = null;

export async function registrarServiceWorker(alHaberActualizacion: () => void): Promise<void> {
  onUpdate = alHaberActualizacion;

  if (typeof window === 'undefined' || !('serviceWorker' in navigator) || __DEV__) {
    return;
  }

  if (registrando) return;
  registrando = true;

  try {
    const registration = await navigator.serviceWorker.register('/sw.js');
    swRegistration = registration;

    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            onUpdate?.();
          }
        });
      }
    });

    if (registration.waiting && navigator.serviceWorker.controller) {
      onUpdate?.();
    }
  } catch (error) {
    console.error('Error registrando service worker', error);
  } finally {
    registrando = false;
  }
}

export function aplicarActualizacion(): void {
  if (!swRegistration || !swRegistration.waiting) {
    window.location.reload();
    return;
  }
  
  swRegistration.waiting.addEventListener('statechange', (e) => {
    if ((e.target as ServiceWorker).state === 'activated') {
      window.location.reload();
    }
  });
  
  swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
}
