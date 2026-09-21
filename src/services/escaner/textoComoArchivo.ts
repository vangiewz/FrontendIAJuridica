import { File, Paths } from 'expo-file-system';
import { ArchivoSeleccionado } from '../../models/documentos';
import { borrarArchivo } from './imagenes';

/**
 * El texto reconocido como un archivo `.txt` temporal, con la forma que ya espera el flujo
 * documental (`ArchivoSeleccionado`): así entra por el MISMO `subirDocumento` que un PDF
 * elegido desde Archivos. El backend ya acepta `.txt` (UTF-8), no hace falta otro endpoint.
 *
 * El archivo del disco tiene un nombre seguro; el que ve el usuario (y guarda el backend) es
 * `nombre`. Quien lo use debe llamar a `borrar()` cuando el backend ya lo recibió.
 */
export function crearArchivoDeTexto(nombre: string, texto: string): { archivo: ArchivoSeleccionado; borrar: () => void } {
  const archivo = new File(Paths.cache, `escaneo-${Date.now()}.txt`);
  archivo.create({ overwrite: true });
  archivo.write(texto);
  const uri = archivo.uri;
  return {
    archivo: { nombre, extension: '.txt', tamano: archivo.size, mimeType: 'text/plain', uri },
    borrar: () => borrarArchivo(uri),
  };
}
