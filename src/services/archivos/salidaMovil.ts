import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { ArchivoDescargado } from '../api';
import { FormatoSalida, conExtension, mimeDeFormato, nombreUnico } from './tiposArchivo';

/**
 * SALIDA de archivos en el teléfono: guardar y compartir lo que el backend ya genera.
 *
 * No genera nada: el archivo es el que devuelve el backend (documento generado en Word/PDF,
 * reporte en PDF/Word/Excel/PowerPoint), tal cual. Aquí solo se baja a la CACHÉ PRIVADA
 * de la app y desde ahí se comparte (share sheet de Android) o se guarda donde el usuario
 * elija (selector de carpeta del sistema: Storage Access Framework).
 *
 * Solo móvil. En web la descarga sigue siendo la de siempre (`services/descargas.ts`).
 */

const CARPETA = 'salidas';
/** Un temporal más viejo que esto ya no lo necesita ninguna app destino y se borra. */
const VIDA_MAXIMA_MS = 2 * 60 * 60 * 1000;

export interface ArchivoSalida {
  uri: string;
  nombre: string;
  mime: string;
  tamano: number;
}

function carpetaDeSalidas(): Directory {
  const carpeta = new Directory(Paths.cache, CARPETA);
  if (!carpeta.exists) carpeta.create({ intermediates: true });
  return carpeta;
}

/**
 * Limpia los temporales viejos. NO borra los recientes a propósito: la app destino (Gmail,
 * WhatsApp, Drive) puede seguir leyendo el archivo unos instantes después de que se cierra
 * el share sheet, y borrarlo antes lo rompería.
 */
export function limpiarSalidasViejas(ahora = Date.now()): void {
  try {
    for (const entrada of carpetaDeSalidas().list()) {
      if (!(entrada instanceof File)) continue;
      const modificado = entrada.modificationTime;
      if (modificado === null || ahora - modificado > VIDA_MAXIMA_MS) entrada.delete();
    }
  } catch {
    // Es caché: si no se pudo limpiar ahora, se limpia la próxima vez.
  }
}

function blobABase64(blob: Blob): Promise<string> {
  return new Promise((resolver, rechazar) => {
    const lector = new FileReader();
    lector.onerror = () => rechazar(new Error('No se pudo leer el archivo descargado.'));
    lector.onloadend = () => {
      const resultado = String(lector.result ?? '');
      const coma = resultado.indexOf(',');
      resolver(coma >= 0 ? resultado.slice(coma + 1) : '');
    };
    lector.readAsDataURL(blob);
  });
}

/** Deja en la caché privada el archivo que devolvió el backend. Sin base64 vacío: un archivo vacío es un fallo. */
export async function guardarEnCache(descargado: ArchivoDescargado, formato: FormatoSalida): Promise<ArchivoSalida> {
  limpiarSalidasViejas();
  const nombre = conExtension(descargado.nombre, formato);
  const contenido = await blobABase64(descargado.blob);
  if (!contenido) throw { mensaje: 'El archivo llegó vacío.', codigo: 'ARCHIVO_VACIO', estado: 0 };
  const archivo = new File(carpetaDeSalidas(), nombre);
  archivo.create({ overwrite: true });
  archivo.write(contenido, { encoding: 'base64' });
  return { uri: archivo.uri, nombre, mime: mimeDeFormato(formato), tamano: archivo.size };
}

/** Un archivo que ya está en caché y sigue existiendo (para no volver a bajarlo al compartir tras guardar). */
export function sigueEnCache(archivo: ArchivoSalida): boolean {
  try { return new File(archivo.uri).exists; } catch { return false; }
}

/** Abre el share sheet de Android con el MIME real del archivo. Resuelve cuando el usuario lo cierra o elige. */
export async function compartirArchivo(archivo: ArchivoSalida): Promise<void> {
  if (!(await Sharing.isAvailableAsync())) {
    throw { mensaje: 'Este dispositivo no permite compartir archivos.', codigo: 'SHARE_NO_DISPONIBLE', estado: 0 };
  }
  await Sharing.shareAsync(archivo.uri, { mimeType: archivo.mime, dialogTitle: `Compartir ${archivo.nombre}` });
}

const fueCancelado = (e: unknown) => /cancel/i.test(String((e as { message?: string })?.message ?? e));

/**
 * Guarda el archivo donde el usuario elija: abre el selector de carpeta del sistema (SAF), no
 * pide ningún permiso de almacenamiento y no toca más que esa carpeta. Si ya hay un archivo
 * con ese nombre, el nuevo se llama «nombre (1).ext»: nunca se sobrescribe.
 * Devuelve el nombre con el que quedó, o `null` si el usuario canceló.
 */
export async function guardarEnDispositivo(archivo: ArchivoSalida): Promise<string | null> {
  let carpeta: Directory;
  try {
    carpeta = await Directory.pickDirectoryAsync();
  } catch (e) {
    if (fueCancelado(e)) return null;
    throw e;
  }
  let existentes: string[] = [];
  try { existentes = carpeta.list().map((entrada) => entrada.name); } catch { /* sin lista: el sistema evita el choque de nombres */ }
  const nombre = nombreUnico(archivo.nombre, existentes);
  const destino = carpeta.createFile(nombre, archivo.mime);
  destino.write(await new File(archivo.uri).bytes());
  return nombre;
}
