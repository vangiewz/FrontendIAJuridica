/**
 * Estados del avatar y cómo se deducen de los estados REALES de la app.
 * Lógica pura (sin React Native): se prueba sola.
 */
export type EstadoAvatar = 'idle' | 'listening' | 'transcribing' | 'thinking' | 'speaking' | 'error';

/** Descripción para lectores de pantalla. */
export const ETIQUETA_AVATAR: Record<EstadoAvatar, string> = {
  idle: 'Asistente jurídico, en espera',
  listening: 'Asistente jurídico, escuchando',
  transcribing: 'Asistente jurídico, transcribiendo',
  thinking: 'Asistente jurídico, analizando tu consulta',
  speaking: 'Asistente jurídico, leyendo la respuesta',
  error: 'Asistente jurídico, con un problema',
};

/** Texto de estado para acompañar al avatar; `null` en reposo (se muestra el texto habitual). */
export const TEXTO_ESTADO: Record<EstadoAvatar, string | null> = {
  idle: null,
  listening: 'Te escucho…',
  transcribing: 'Transcribiendo…',
  thinking: 'Analizando tu consulta…',
  speaking: 'Leyendo la respuesta…',
  error: null,
};

export interface EntradaEstadoAvatar {
  /** Estado del dictado (`useDictado`): inactivo, permiso, escuchando, transcribiendo, instalando o error. */
  dictado: string;
  /** El aviso del dictado es informativo (no es un fallo). */
  dictadoInformativo?: boolean;
  /** La respuesta se está leyendo en voz alta (TTS). */
  hablando: boolean;
  /** Hay una consulta en curso: el servidor está analizándola. */
  procesando: boolean;
  /** La última consulta falló, o no se llega al servidor. */
  conError: boolean;
}

/**
 * Qué muestra el avatar. Prioridad: lo que el usuario está haciendo ahora (hablar) manda
 * sobre lo que la app hace por él (leer, analizar).
 */
export function resolverEstadoAvatar(e: EntradaEstadoAvatar): EstadoAvatar {
  if (e.dictado === 'escuchando') return 'listening';
  if (e.dictado === 'permiso' || e.dictado === 'transcribiendo' || e.dictado === 'instalando') return 'transcribing';
  if (e.dictado === 'error' && !e.dictadoInformativo) return 'error';
  if (e.hablando) return 'speaking';
  if (e.procesando) return 'thinking';
  if (e.conError) return 'error';
  return 'idle';
}

/**
 * Estado del avatar DENTRO del panel de voz: ahí solo importa el dictado (un aviso
 * informativo no es un error y no debe verse como tal).
 */
export function estadoAvatarDelPanel(dictado: string, informativo: boolean): EstadoAvatar {
  return resolverEstadoAvatar({ dictado, dictadoInformativo: informativo,
    hablando: false, procesando: false, conError: false });
}
