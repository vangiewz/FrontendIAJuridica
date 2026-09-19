import { peticion } from './api';
import { FuenteDisponible, ReporteIngesta } from '../models/administracion';
import { ArchivoSeleccionado } from '../models/documentos';

export async function listarFuentes(): Promise<FuenteDisponible[]> {
  return peticion<FuenteDisponible[]>('/api/v1/admin/normativa/fuentes');
}

/**
 * Ejecuta la ingesta de una fuente normativa.
 *
 * Sin archivo el backend usa el corpus que viene incluido en el sistema, igual que
 * el comando de consola. Content-Type no se fija a mano: lo escribe fetch con su
 * boundary, como en la carga de documentos.
 */
export async function ingestarNormativa(
  fuente: string,
  archivo: ArchivoSeleccionado | null
): Promise<ReporteIngesta> {
  const cuerpo = new FormData();
  cuerpo.append('fuente', fuente);

  if (archivo) {
    if (archivo.archivoWeb) {
      cuerpo.append('archivo', archivo.archivoWeb, archivo.nombre);
    } else {
      cuerpo.append('archivo', {
        uri: archivo.uri,
        name: archivo.nombre,
        type: archivo.mimeType ?? 'application/pdf',
      } as unknown as Blob);
    }
  }

  return peticion<ReporteIngesta>('/api/v1/admin/normativa/ingestas', {
    method: 'POST',
    body: cuerpo,
  });
}
