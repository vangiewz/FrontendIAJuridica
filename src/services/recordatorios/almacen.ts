import { File, Paths } from 'expo-file-system';
import { parsearRecordatorios, RecordatorioJuridico, serializarRecordatorios } from './modelo';

/**
 * Dónde se guardan los recordatorios en el teléfono: un archivo JSON en la memoria PRIVADA de la
 * app (`Paths.document`). Es lo que ya usa el proyecto para archivos, sobrevive a cerrar y a
 * reiniciar la app, y no hay que montar una base de datos para un puñado de registros.
 * (`SecureStore` se descartó: está pensado para secretos pequeños, no para una lista.)
 *
 * Lo que se guarda es SOLO metadata: título que dictó el usuario, fecha y hora, tipo, y el id y
 * el nombre del documento asociado. Nunca el texto ni el análisis de un documento.
 *
 * Es local a ESTE dispositivo: no hay sincronización entre teléfonos ni con el backend.
 */

const archivo = () => new File(Paths.document, 'recordatorios.json');

export async function leerRecordatorios(): Promise<RecordatorioJuridico[]> {
  try {
    const f = archivo();
    return f.exists ? parsearRecordatorios(await f.text()) : [];
  } catch {
    return [];
  }
}

/** Escribe la lista completa. Lanza si no pudo: quien llama decide qué deshacer. */
export function guardarRecordatorios(items: RecordatorioJuridico[]): void {
  const f = archivo();
  if (!f.exists) f.create({ overwrite: true });
  f.write(serializarRecordatorios(items));
}
