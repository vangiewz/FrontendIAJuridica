import { Platform } from 'react-native';
import TextRecognition, { TextRecognitionScript } from '@react-native-ml-kit/text-recognition';
import { armarTextoOcr } from './escanerPuro';

/**
 * OCR LOCAL: Google ML Kit Text Recognition (guion latino: español con tildes y ñ), que se
 * ejecuta EN el teléfono. El modelo viaja dentro de la app (`com.google.mlkit:text-recognition`,
 * no el módulo descargable de Google Play Services), así que funciona sin Internet y la
 * imagen nunca sale del dispositivo. No hay ninguna API de nube en este camino.
 *
 * Solo Android: en web y iOS no hay motor local, y la pantalla no ofrece escanear.
 */
export const OCR_DISPONIBLE = Platform.OS === 'android';

/**
 * El texto de UNA imagen, tal como lo vio el reconocedor. No se corrige ni se completa:
 * el OCR es una lectura, y el análisis jurídico es otra cosa que viene después.
 * Lanza si el módulo nativo no está en esta compilación (falta el rebuild) o si falla.
 */
export async function reconocerTexto(uri: string): Promise<string> {
  if (!OCR_DISPONIBLE) throw new Error('El reconocimiento de texto solo está disponible en Android.');
  const resultado = await TextRecognition.recognize(uri, TextRecognitionScript.LATIN);
  return armarTextoOcr(resultado.blocks.map((b) => ({ lineas: b.lines.map((l) => l.text) })));
}
