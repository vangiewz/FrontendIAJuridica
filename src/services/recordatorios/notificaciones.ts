import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { aClave, aDate, deClave } from './fechas';
import {
  HORIZONTE_MENSUAL, ocurrenciasMensuales, RecordatorioJuridico, textoNotificacion, usaOcurrenciasExplicitas,
} from './modelo';

/**
 * NOTIFICACIONES LOCALES de Android (`expo-notifications`). Solo esto: no hay servidor de push,
 * ni Firebase, ni Expo Push Service, ni ningún servicio en la nube.
 *
 * El recordatorio queda programado EN el teléfono (AlarmManager). Sonará aunque no haya Internet
 * y aunque el backend, FastAPI u Ollama estén apagados: Android lo dispara solo, sin servicios en
 * segundo plano, sin sondeos ni temporizadores de la app. Para AGENDAR (por voz) sí hace falta
 * la app; para que SUENE, no.
 *
 * Hora: no se piden alarmas exactas (`SCHEDULE_EXACT_ALARM`). Un recordatorio jurídico no es una
 * alarma crítica; Android puede adelantar o retrasar el aviso unos minutos por ahorro de batería.
 */

export const NOTIFICACIONES_DISPONIBLES = Platform.OS === 'android';
export const CANAL_ID = 'recordatorios-juridicos';

export type EstadoPermiso = 'concedido' | 'denegado' | 'denegado_definitivo';

/** Con la app abierta el aviso se ve como banner, sin sonido: no le pisa la voz a la llamada. */
export function configurarManejador(): void {
  if (!NOTIFICACIONES_DISPONIBLES) return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false,
    }),
  });
}

/**
 * El canal «Recordatorios jurídicos»: importancia ALTA (suena y avisa en pantalla, como un
 * recordatorio; NO máxima ni de emergencia), sonido y vibración normales, sin insignia. Se
 * marca PRIVADO: en la pantalla bloqueada Android oculta el contenido hasta desbloquear.
 * Crearlo de nuevo es inofensivo; debe existir ANTES de pedir el permiso en Android 13+.
 */
export async function prepararCanal(): Promise<void> {
  if (!NOTIFICACIONES_DISPONIBLES) return;
  await Notifications.setNotificationChannelAsync(CANAL_ID, {
    name: 'Recordatorios jurídicos',
    description: 'Avisos de vencimientos y fechas que pediste recordar.',
    importance: Notifications.AndroidImportance.HIGH,
    sound: 'default',
    enableVibrate: true,
    vibrationPattern: [0, 250, 250, 250],
    enableLights: false,
    showBadge: false,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PRIVATE,
  });
}

// ── Permiso ─────────────────────────────────────────────────────────────────────────────
const aEstado = (p: { granted: boolean; canAskAgain: boolean }): EstadoPermiso =>
  p.granted ? 'concedido' : p.canAskAgain ? 'denegado' : 'denegado_definitivo';

/** Sin preguntar nada al usuario. */
export async function consultarPermiso(): Promise<EstadoPermiso> {
  return aEstado(await Notifications.getPermissionsAsync());
}

/**
 * Muestra el diálogo del sistema. Se llama SOLO cuando el usuario intenta crear un recordatorio
 * (no al arrancar). Si ya estaba concedido no pregunta; si Android ya no deja preguntar, solo
 * queda «Abrir configuración».
 */
export async function pedirPermiso(): Promise<EstadoPermiso> {
  const actual = await Notifications.getPermissionsAsync();
  if (actual.granted || !actual.canAskAgain) return aEstado(actual);
  await prepararCanal();
  return aEstado(await Notifications.requestPermissionsAsync());
}

// ── Programar y cancelar ────────────────────────────────────────────────────────────────
const DATOS = { v: 1 } as const;

async function programarUna(r: RecordatorioJuridico, trigger: Notifications.SchedulableNotificationTriggerInput): Promise<string> {
  const { titulo, cuerpo } = textoNotificacion(r);
  return Notifications.scheduleNotificationAsync({
    // Solo el id del recordatorio viaja en los datos: al tocar el aviso se resuelve la metadata local.
    content: { title: titulo, body: cuerpo, data: { ...DATOS, recordatorioId: r.id }, sound: 'default', color: '#1B6B4A' },
    trigger,
  });
}

export async function cancelarIds(ids: string[]): Promise<void> {
  await Promise.all(ids.map((id) => Notifications.cancelScheduledNotificationAsync(id).catch(() => undefined)));
}

/** Programa los avisos mensuales explícitos (día 29–31) que faltan hasta completar el horizonte. */
async function programarMensualesExplicitos(
  r: RecordatorioJuridico, ahora: Date, existentes: number, desde: Date,
): Promise<{ ids: string[]; hasta: string | undefined }> {
  const base = deClave(r.fechaHora);
  if (!base || r.repeticion?.tipo !== 'mensual') return { ids: [], hasta: undefined };
  const fechas = ocurrenciasMensuales(r.repeticion.dia, base.hora, desde.getTime() > ahora.getTime() ? desde : ahora, HORIZONTE_MENSUAL - existentes);
  const ids: string[] = [];
  try {
    for (const f of fechas) {
      ids.push(await programarUna(r, { type: Notifications.SchedulableTriggerInputTypes.DATE, date: aDate(f, base.hora), channelId: CANAL_ID }));
    }
  } catch (e) {
    await cancelarIds(ids); // todo o nada: no queda una serie a medias
    throw e;
  }
  const ultima = fechas[fechas.length - 1];
  return { ids, hasta: ultima ? aClave(ultima, base.hora) : undefined };
}

/**
 * Programa el recordatorio en Android y devuelve los identificadores. Si algo falla a medias,
 * lo ya programado se cancela y el error se propaga: nunca queda una programación parcial.
 */
export async function programar(r: RecordatorioJuridico, ahora = new Date()): Promise<{ ids: string[]; programadasHasta?: string }> {
  const base = deClave(r.fechaHora);
  if (!base) throw { mensaje: 'La fecha del recordatorio no es válida.', codigo: 'FECHA_INVALIDA', estado: 0 };
  const T = Notifications.SchedulableTriggerInputTypes;
  const rep = r.repeticion;
  if (!rep) {
    return { ids: [await programarUna(r, { type: T.DATE, date: aDate(base.fecha, base.hora), channelId: CANAL_ID })] };
  }
  if (rep.tipo === 'diaria') {
    return { ids: [await programarUna(r, { type: T.DAILY, hour: base.hora.hora, minute: base.hora.minuto, channelId: CANAL_ID })] };
  }
  if (rep.tipo === 'semanal') {
    // expo-notifications numera la semana de 1 (domingo) a 7 (sábado).
    return { ids: [await programarUna(r, { type: T.WEEKLY, weekday: rep.diaSemana + 1, hour: base.hora.hora, minute: base.hora.minuto, channelId: CANAL_ID })] };
  }
  if (!usaOcurrenciasExplicitas(rep)) {
    // Días 1–28: el mensual nativo es exacto y no caduca.
    return { ids: [await programarUna(r, { type: T.MONTHLY, day: rep.dia, hour: base.hora.hora, minute: base.hora.minuto, channelId: CANAL_ID })] };
  }
  // Días 29–31: el mensual nativo desborda al mes siguiente en los meses cortos. Se programan
  // avisos uno a uno (último día del mes en los meses cortos) y se renuevan al abrir la app.
  const { ids, hasta } = await programarMensualesExplicitos(r, ahora, 0, ahora);
  return { ids, programadasHasta: hasta };
}

/** Repone los avisos mensuales (día 29–31) que faltan hasta el horizonte. */
export async function rellenarMensual(r: RecordatorioJuridico, presentes: string[], ahora = new Date()): Promise<{ ids: string[]; programadasHasta?: string }> {
  const desde = deClave(r.programadasHasta ?? '')
    ? aDate(deClave(r.programadasHasta!)!.fecha, deClave(r.programadasHasta!)!.hora) : ahora;
  const { ids, hasta } = await programarMensualesExplicitos(r, ahora, presentes.length, desde);
  return { ids: [...presentes, ...ids], programadasHasta: hasta ?? r.programadasHasta };
}

export async function idsProgramados(): Promise<Set<string>> {
  const pedidos = await Notifications.getAllScheduledNotificationsAsync();
  return new Set(pedidos.map((p) => p.identifier));
}

// ── Tocar la notificación ───────────────────────────────────────────────────────────────
export interface ToqueDeNotificacion {
  /** Único por notificación tocada: sirve para no procesar dos veces la misma. */
  clave: string;
  recordatorioId: string;
}

export function toqueDe(respuesta: Notifications.NotificationResponse | null): ToqueDeNotificacion | null {
  if (!respuesta) return null;
  const pedido = respuesta.notification.request;
  const id = (pedido.content.data as { recordatorioId?: unknown } | undefined)?.recordatorioId;
  if (typeof id !== 'string' || !id) return null;
  return { clave: `${pedido.identifier}|${respuesta.notification.date}|${respuesta.actionIdentifier}`, recordatorioId: id };
}

export const ultimoToque = (): ToqueDeNotificacion | null => toqueDe(Notifications.getLastNotificationResponse());
export const limpiarUltimoToque = () => Notifications.clearLastNotificationResponse();
export const alTocar = (oyente: (t: ToqueDeNotificacion) => void) =>
  Notifications.addNotificationResponseReceivedListener((r) => { const t = toqueDe(r); if (t) oyente(t); });
