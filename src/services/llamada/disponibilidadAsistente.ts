import { Platform } from 'react-native';
import type { Disponibilidad, Plataforma } from '../../config/capacidadesAsistente';
import { OCR_DISPONIBLE } from '../escaner/ocrLocal';
import { NOTIFICACIONES_DISPONIBLES } from '../recordatorios/notificaciones';

/**
 * Lo que ESTE dispositivo y ESTA compilación pueden hacer, tomado de las mismas comprobaciones que ya
 * usa cada función (no se repite ninguna regla): el catálogo de capacidades se filtra con esto, así la
 * ayuda nunca anuncia lo que la pantalla oculta ni lo que una compilación vieja no incluye.
 *
 * - Cámara y OCR: `OCR_DISPONIBLE` (Android).
 * - Recordatorios: `NOTIFICACIONES_DISPONIBLES` (Android CON el módulo de notificaciones compilado; con un
 *   APK anterior a esa función queda en falso y la ayuda deja de ofrecerlos).
 * - Recibir y guardar/compartir archivos: solo Android (el filtro de «Compartir» y el selector de carpetas).
 * - Llamada por voz: cualquier teléfono; en web solo hay chat.
 */
const PLATAFORMA: Plataforma = Platform.OS === 'android' ? 'android' : Platform.OS === 'ios' ? 'ios' : 'web';

export const DISPONIBILIDAD: Disponibilidad = {
  plataforma: PLATAFORMA,
  llamada: PLATAFORMA !== 'web',
  camara: OCR_DISPONIBLE,
  recibir: PLATAFORMA === 'android',
  salida: PLATAFORMA === 'android',
  recordatorios: NOTIFICACIONES_DISPONIBLES,
};
