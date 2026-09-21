import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { File } from 'expo-file-system';
import { tamanoDestino } from './escanerPuro';

/** JPEG a esta calidad conserva bien el texto impreso sin ocupar de más. */
const CALIDAD_JPEG = 0.85;

export function borrarArchivo(uri: string | null | undefined): void {
  if (!uri) return;
  try {
    const archivo = new File(uri);
    if (archivo.exists) archivo.delete();
  } catch {
    // Un temporal que no se pudo borrar lo limpia el sistema (es caché): no es un error para el usuario.
  }
}

export function borrarArchivos(uris: (string | null | undefined)[]): void {
  uris.forEach(borrarArchivo);
}

export interface ImagenPreparada { uri: string; ancho: number; alto: number }

/**
 * Deja la foto lista para el OCR: la cámara ya la entrega con la orientación aplicada; aquí
 * solo se acota el lado mayor (una foto de 200 MP no aporta nada al texto y pesa memoria).
 * Si ya cabe se devuelve tal cual, sin volver a comprimirla.
 */
export async function prepararImagen(uri: string, ancho: number, alto: number): Promise<ImagenPreparada> {
  const destino = tamanoDestino(ancho, alto);
  if (!destino) return { uri, ancho, alto };
  const contexto = ImageManipulator.manipulate(uri).resize(destino);
  const imagen = await contexto.renderAsync();
  const guardada = await imagen.saveAsync({ format: SaveFormat.JPEG, compress: CALIDAD_JPEG });
  borrarArchivo(uri); // la original ya no hace falta
  return { uri: guardada.uri, ancho: guardada.width, alto: guardada.height };
}

/** Gira la página 90° a la derecha. Devuelve otro archivo y borra el anterior. */
export async function rotarImagen(uri: string): Promise<ImagenPreparada> {
  const contexto = ImageManipulator.manipulate(uri).rotate(90);
  const imagen = await contexto.renderAsync();
  const guardada = await imagen.saveAsync({ format: SaveFormat.JPEG, compress: CALIDAD_JPEG });
  borrarArchivo(uri);
  return { uri: guardada.uri, ancho: guardada.width, alto: guardada.height };
}
