import { Platform } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { ArchivoSeleccionado, EXTENSIONES_PERMITIDAS } from '../models/documentos';

const MIME_POR_EXTENSION: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.txt': 'text/plain',
};

/** En web el `accept` del input tambien entiende extensiones; en movil el filtro es por MIME. */
function tiposAceptados(extensiones: readonly string[]): string[] {
  const mimes = extensiones.map((e) => MIME_POR_EXTENSION[e]).filter(Boolean);
  return Platform.OS === 'web' ? [...mimes, ...extensiones] : mimes;
}

function extensionDe(nombre: string): string {
  const punto = nombre.lastIndexOf('.');
  return punto === -1 ? '' : nombre.slice(punto).toLowerCase();
}

/**
 * Abre el selector del sistema. Devuelve null si el usuario cancelo.
 *
 * `base64: false` es deliberado: en web el File ya viaja en el FormData, y codificar
 * un PDF de varios MB a base64 para despues descartarlo es memoria y tiempo de mas.
 */
export async function seleccionarDocumento(
  extensiones: readonly string[] = EXTENSIONES_PERMITIDAS
): Promise<ArchivoSeleccionado | null> {
  const resultado = await DocumentPicker.getDocumentAsync({
    type: tiposAceptados(extensiones),
    multiple: false,
    copyToCacheDirectory: true,
    base64: false,
  });

  if (resultado.canceled || !resultado.assets || resultado.assets.length === 0) {
    return null;
  }

  const asset = resultado.assets[0];
  const extension = extensionDe(asset.name);

  return {
    nombre: asset.name,
    extension,
    tamano: asset.size ?? asset.file?.size ?? null,
    mimeType: asset.mimeType ?? MIME_POR_EXTENSION[extension] ?? null,
    uri: asset.uri,
    archivoWeb: asset.file,
  };
}
