import { Platform } from 'react-native';
import { ArchivoDescargado } from './api';

/**
 * Guardar un archivo que llego del backend.
 *
 * En web se resuelve con un enlace temporal, sin dependencias. En Android/iOS haria
 * falta expo-file-system y expo-sharing, que hoy no estan en el proyecto: en vez de
 * fallar de forma confusa, se avisa que la descarga es de la version web. El resto de
 * la pantalla funciona igual en el telefono.
 */
export const descargaDisponible = Platform.OS === 'web';

export function guardarArchivo({ blob, nombre }: ArchivoDescargado): void {
  if (!descargaDisponible) {
    throw {
      mensaje: 'La descarga de archivos está disponible en la versión web.',
      codigo: 'DESCARGA_NO_SOPORTADA',
      estado: 0,
    };
  }
  const documento = (globalThis as any).document;
  const url = (globalThis as any).URL;
  if (!documento || !url) return;

  const enlace = documento.createElement('a');
  enlace.href = url.createObjectURL(blob);
  enlace.download = nombre;
  documento.body.appendChild(enlace);
  enlace.click();
  documento.body.removeChild(enlace);
  url.revokeObjectURL(enlace.href);
}
