import { PREFIJO, re } from './intencionBase';

/**
 * Reglas de voz de los RECORDATORIOS. Lógica pura, anclada al inicio de la frase como el resto
 * del enrutador: una orden empieza por su verbo («recordame…», «cancelá el recordatorio…»); una
 * pregunta jurídica («¿cuál es el plazo para cancelar un contrato?», «¿qué significa recordatorio
 * de pago?») no calza y sigue siendo una consulta.
 *
 * Dos cosas que NO hace este módulo, a propósito:
 *  - No interpreta fechas (eso es `recordatorios/interpretar.ts`): solo decide QUÉ quiere hacer.
 *  - No captura un «sí» global: «sí», «confirmar», «no»… solo significan algo mientras hay una
 *    propuesta o una cancelación esperando decisión (`ctx.recordatorio`).
 */

export type AccionRecordatorio = 'crear' | 'listar' | 'cancelar' | 'editar';
export type RespuestaRecordatorio = 'confirmar' | 'rechazar' | 'ajustar';

export interface ContextoRecordatorios {
  /**
   * Hay algo esperando decisión: una `oferta` (una fecha del documento: «¿querés que te
   * recuerde?»), una `confirmacion` (fecha y hora concretas mostradas en el panel) o una
   * `cancelacion` (¿cancelar este recordatorio?).
   */
  recordatorio?: 'oferta' | 'confirmacion' | 'cancelacion' | null;
  /** Un recordatorio está a la vista (lista con uno solo, detalle o notificación tocada). */
  recordatorioAbierto?: boolean;
  /** Cuántos recordatorios existen. */
  recordatorios?: number;
}

const SI = re(`${PREFIJO}(?:si|si por favor|confirm\\w*|crealo|crea|dale|ok|okey|listo|de acuerdo|esta bien|programalo|hacelo|hagalo|adelante|claro|correcto|perfecto)$`);
const SI_CANCELAR = re(`${PREFIJO}(?:si|confirm\\w*|cancelalo|cancelar|borralo|eliminalo|dale|ok|adelante|claro)$`);
const NO = re(`${PREFIJO}(?:no|no gracias|cancel\\w*|dejalo|dejalo asi|olvidalo|descart\\w*|nada|mejor no|volver|no lo crees)$`);
const NO_CANCELAR = re(`${PREFIJO}(?:no|no gracias|dejalo|dejalo asi|olvidalo|volver|mejor no|nada)$`);

const RECORDATORIO = '(?:recordatorio|aviso)s?';

const CREAR = re(
  `${PREFIJO}(?:(?:record(?:ame|a|ar|arme|es)|recuerd(?:ame|a|es)|avis(?:ame|a|arme|es)|agend(?:ame|a|es))\\b` +
  `|(?:crea\\w*|program\\w*|pon\\w*|agreg\\w*|genera\\w*|hac\\w*)\\s+(?:me\\s+)?(?:un\\s+)?recordatorio\\b` +
  `|(?:un\\s+)?recordatorio\\s+(?:para|de|del)\\b)`);

const LISTAR = re(
  `${PREFIJO}(?:(?:que|cuales)\\s+recordatorios\\s+(?:tengo|hay|tenemos|estan|quedan)\\b` +
  `|cuantos\\s+recordatorios\\s+(?:tengo|hay)\\b` +
  `|(?:mostr\\w*|muestr\\w*|ver|veo|lista\\w*|abr\\w*|dame|dime|revis\\w*|consult\\w*)\\s+(?:me\\s+)?(?:la\\s+lista\\s+de\\s+)?(?:los\\s+|mis\\s+)?(?:proximos\\s+)?(?:recordatorios|avisos)\\b` +
  `|tengo\\s+(?:algun\\s+|algunos\\s+)?recordatorios?\\b` +
  `|mis\\s+recordatorios\\b)`);

const CANCELAR = re(
  `${PREFIJO}(?:cancel\\w*|elimin\\w*|borr\\w*|quit\\w*|anul\\w*)\\s+(?:me\\s+)?(?:el|este|ese|mi|los|todos\\s+los)\\s+(?:proximo\\s+)?${RECORDATORIO}\\b`);
const CANCELAR_ABIERTO = re(`${PREFIJO}(?:cancel\\w*|elimin\\w*|borr\\w*|anul\\w*)(?:lo|la)$`);

const EDITAR = re(
  `${PREFIJO}(?:cambi\\w*|modific\\w*|edit\\w*|reprogram\\w*|mov\\w*|pospon\\w*|atras\\w*|adelant\\w*|pas\\w*|actualiz\\w*|corrig\\w*)` +
  `\\s+(?:me\\s+)?(?:el|la|este|ese|mi)?\\s*(?:hora\\s+del\\s+|fecha\\s+del\\s+|dia\\s+del\\s+)?${RECORDATORIO}\\b`);
const POSPONER = re(`${PREFIJO}pospon\\w*\\b`);
const EDITAR_ABIERTO = re(`${PREFIJO}(?:pas\\w*|mov\\w*|cambi\\w*|reprogram\\w*|adelant\\w*|atras\\w*)(?:lo|la)\\s+(?:para|a)\\b`);

// Algo que suena a «otra fecha u hora»: con una propuesta pendiente, se toma como un ajuste.
const PISTA_DE_FECHA = re(
  '\\b(?:manana|hoy|pasado|lunes|martes|miercoles|jueves|viernes|sabado|domingo|dias?|semanas?|mes(?:es)?|antes|' +
  'las?\\s+\\d|\\d{1,2}[:/]\\d{1,2}|\\d{1,2}\\s+de\\s+[a-z]+|el\\s+\\d{1,2}|mediodia|medianoche|hora|fecha|mejor|cambi\\w+|otro)\\b');

/** «Sí», «confirmar», «no», «dejalo»… SOLO si hay algo pendiente de decisión. */
export function respuestaAPendiente(p: string, ctx: ContextoRecordatorios): 'confirmar' | 'rechazar' | null {
  if (!ctx.recordatorio) return null;
  if (ctx.recordatorio === 'cancelacion') {
    if (NO_CANCELAR.test(p)) return 'rechazar';
    return SI_CANCELAR.test(p) ? 'confirmar' : null;
  }
  if (SI.test(p)) return 'confirmar';
  return NO.test(p) ? 'rechazar' : null;
}

/** Crear, listar, cancelar o editar un recordatorio. `null` si la frase no es una orden de recordatorios. */
export function accionDeRecordatorio(p: string, ctx: ContextoRecordatorios): AccionRecordatorio | null {
  if (CANCELAR.test(p) || (ctx.recordatorioAbierto && CANCELAR_ABIERTO.test(p))) return 'cancelar';
  if (EDITAR.test(p) || (ctx.recordatorioAbierto && EDITAR_ABIERTO.test(p))
    || ((ctx.recordatorioAbierto || (ctx.recordatorios ?? 0) > 0) && POSPONER.test(p))) return 'editar';
  if (LISTAR.test(p)) return 'listar';
  if (CREAR.test(p)) return 'crear';
  return null;
}

/** Con una propuesta pendiente, una frase corta con una fecha u hora nueva la CAMBIA (no la confirma). */
export function esAjusteDePropuesta(p: string, ctx: ContextoRecordatorios): boolean {
  if (ctx.recordatorio !== 'oferta' && ctx.recordatorio !== 'confirmacion') return false;
  return p.split(' ').length <= 9 && PISTA_DE_FECHA.test(p);
}
