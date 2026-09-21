import { aPlano, DET, DOC, PREFIJO, re } from './intencionBase';
import { detectarTemaAyuda } from './intencionAyuda';
import type { TemaAyuda } from './intencionAyuda';
import {
  accionDeRecordatorio, AccionRecordatorio, ContextoRecordatorios, esAjusteDePropuesta, respuestaAPendiente,
  RespuestaRecordatorio,
} from './intencionRecordatorios';
/**
 * Qué quiere hacer el usuario cuando habla en la llamada. Lógica pura (sin React Native):
 * se prueba sola.
 *
 * El backend NO tiene un enrutador entre módulos: `services/consultas/intencion.py` solo
 * distingue guardar / analizar / preguntar cuando ya hay un documento adjunto, y lo hace
 * con reglas léxicas, sin modelo. Esto sigue el mismo criterio —determinista, sin otra IA
 * ni otro modelo solo para clasificar— y por la misma razón: distinguir «generame un
 * reporte» de «¿qué dice el código civil sobre los reportes?» no necesita a Qwen.
 *
 * Lo que lo hace confiable no es la lista de palabras sino la POSICIÓN: una orden empieza
 * por su verbo («generame…», «compará…», «quiero subir…»); una pregunta jurídica, no. Por
 * eso cada regla está anclada al inicio de la frase, y lo que no calza con ninguna regla
 * es una CONSULTA: el flujo jurídico existente, que no cambia.
 */

export type ObjetoMostrable = 'respuesta' | 'documento' | 'comparacion' | 'generado' | 'reporte';

export type IntencionLlamada =
  | { tipo: 'consulta' }
  /** Una pregunta sobre la propia app («¿qué podés hacer?», «¿cómo genero un contrato?»): se responde en el teléfono, sin consulta. */
  | { tipo: 'ayuda'; tema: TemaAyuda }
  /** Abrir el selector: el archivo será el documento activo. */
  | { tipo: 'subir_documento' }
  | { tipo: 'analizar_documento' }
  | { tipo: 'cerrar_documento' }
  | { tipo: 'comparar' }
  | { tipo: 'generar_documento' }
  | { tipo: 'modificar_generado' }
  | { tipo: 'reporte'; ajuste: boolean }
  | { tipo: 'mostrar'; que: ObjetoMostrable }
  | { tipo: 'panel'; accion: 'cerrar' | 'minimizar' | 'expandir' }
  /** Solo mientras hay una pregunta abierta de la generación por voz. */
  | { tipo: 'flujo'; accion: 'cancelar' | 'generar_ya' | 'omitir' | 'responder' }
  /** Abrir la cámara: páginas de un documento en papel, o una sola foto de una cláusula. */
  | { tipo: 'escanear'; modo: 'documento' | 'clausula' }
  /** Solo con un escaneo ya reconocido y sin enviar: «analizalo» habla de ESE escaneo. */
  | { tipo: 'analizar_escaneo' }
  /** Solo con un archivo recibido de otra app esperando decisión: «analizalo» habla de ESE archivo. */
  | { tipo: 'analizar_recibido' }
  /** Guardar en el teléfono o compartir el documento generado o el reporte. */
  | { tipo: 'salida'; accion: 'guardar' | 'compartir'; objeto: 'generado' | 'reporte' | 'auto' }
  /** Crear, listar, cancelar o editar recordatorios (nunca programa nada por sí solo: pide confirmación). */
  | { tipo: 'recordatorio'; accion: AccionRecordatorio }
  /** «Sí» / «no» / otra fecha, SOLO mientras hay una propuesta o una cancelación esperando decisión. */
  | { tipo: 'recordatorio_respuesta'; accion: RespuestaRecordatorio };

/** Lo que la llamada ya tiene, para decidir a qué se refiere la frase. */
export interface ContextoIntencion extends ContextoRecordatorios {
  documentoActivo: boolean;
  analisis: boolean;
  comparacion: boolean;
  generado: boolean;
  reporte: boolean;
  /** Hay una operación conversacional abierta que espera la próxima frase. */
  /** `escaneo`: hay un escaneo reconocido esperando que se lo analice o se lo descarte. */
  flujo: null | 'generacion' | 'comparacion' | 'escaneo';
  /** Hay un archivo recibido de otra app esperando que se lo analice o se lo descarte. */
  recibido?: boolean;
}

export { aPlano };

// ── Pregunta abierta de la generación por voz ────────────────────────────────────────
const FLUJO_CANCELAR = re(
  '\\b(?:cancel\\w*|olvidalo|olvidate|olvida\\w*|abandon\\w*|salir|ya no quiero|no quiero (?:generar|el documento|seguir))\\b');
const FLUJO_GENERAR_YA = re(
  '\\b(?:generalo|generalo asi|genera(?:lo)? (?:asi|ya|ahora)|generar (?:asi|ya|ahora)|' +
  'gener\\w+ (?:el )?(?:documento|borrador)|ya esta|listo|con eso alcanza|es todo|nada mas|' +
  'dejalo asi)\\b');
const FLUJO_OMITIR = re(
  '^(?:no se|no lo se|no tengo|no la tengo|omitir\\w*|omitilo|saltar\\w*|saltalo|salta|paso|' +
  'siguiente|dejalo pendiente|dejala pendiente|no aplica|sin dato|despues|mas tarde)\\b');

// ── Órdenes sobre el documento ──────────────────────────────────────────────────────
const CERRAR_DOCUMENTO = re(
  `${PREFIJO}(?:cerr\\w*|quit\\w*|sac\\w*|olvid\\w*|deja(?:r)? de usar)\\s+${DET}${DOC}`);
const SUBIR = re(
  `${PREFIJO}(?:sub\\w*|cargar?|carg\\w*|adjunt\\w*|import\\w*)\\s+(?:\\w+\\s+){0,2}${DOC}`);
const SUBIR_OTRO = re(`${PREFIJO}(?:sub\\w*|carg\\w*|adjunt\\w*)\\s+otr[oa]s?\\b`);
const CAMBIAR = re(
  `${PREFIJO}(?:cambi\\w*|elegir|eleg\\w*|seleccion\\w*|usar|usa)\\s+(?:de\\s+|al\\s+)?${DET}(?:otro\\s+)?${DOC}`);
const ANALIZAR = re(
  `${PREFIJO}(?:analiz\\w*|revis\\w*|examin\\w*|evalu\\w*)\\s+(${DET})(?:\\w+\\s+){0,1}${DOC}\\b`);

// ── Cámara y escaneo ────────────────────────────────────────────────────────────────
// Solo las ÓRDENES abren la cámara (empiezan por su verbo). «¿Cómo escaneo un contrato para
// que valga?» o «validez de un contrato escaneado» son consultas jurídicas y no calzan.
const ESCANEAR_VERBO = re(`${PREFIJO}(?:escane\\w*|digitaliz\\w*|fotografi\\w*)\\b`);
const USAR_CAMARA = re(`${PREFIJO}(?:usar|usa|utiliz\\w*|abrir|abr\\w*|activ\\w*|prend\\w*)\\s+(?:la\\s+)?camara\\b`);
const SACAR_FOTO = re(`${PREFIJO}(?:sacar|saca\\w*|tomar|toma\\w*|hacer|hac\\w*)\\s+(?:le\\s+|me\\s+)?(?:una\\s+)?foto(?:grafia)?s?\\b`);
const DOCUMENTO_EN_PAPEL = re(
  `${PREFIJO}(?:analiz\\w*|revis\\w*)\\s+(?:\\w+\\s+){0,3}(?:documento|contrato|acuerdo)s?\\s+(?:en|de)\\s+papel\\b`);
// Anuncia la foto sin hacer aún la pregunta: termina en «cláusula». Con más palabras
// («…del contrato de alquiler») ya es una pregunta concreta y va a consulta.
const PREGUNTAR_POR_CLAUSULA = re(
  `${PREFIJO}pregunt\\w*\\s+(?:algo\\s+)?(?:sobre|de|acerca de)\\s+(?:esta|una|la|otra)\\s+clausula$`);
const ES_CLAUSULA = re('\\b(?:clausula|parrafo|articulo|apartado|renglon)s?\\b');
// Decidir sobre un escaneo o un archivo recibido que espera: solo frases CORTAS y sin otro
// contenido. «Analizá el documento», «analizalo», «sí» → analizar; «cancelar», «descartalo» →
// descartar. «¿Cómo cancelo un contrato de alquiler?» sigue siendo una consulta.
const OBJETO_PENDIENTE = '(?:lo|la|el|este|esta|ese|esa|mi|todo|documento|archivo|escaneo|texto|recibido|contrato|pdf|word)';
const ANALIZAR_PENDIENTE = re(
  `${PREFIJO}(?:(?:analiz\\w*|revis\\w*|procesa\\w*|envi\\w*|segu\\w*|continu\\w*)(?:\\s+${OBJETO_PENDIENTE}){0,3}|si|dale|ok|claro|adelante|por favor)$`);
const CANCELAR_PENDIENTE = re(
  `${PREFIJO}(?:cancel\\w*|descart\\w*|olvid\\w*)(?:\\s+${OBJETO_PENDIENTE}){0,2}$`);

// ── Salida: guardar o compartir lo generado ────────────────────────────────────────────
// Solo órdenes que empiezan por su verbo y, sobre todo, solo si HAY algo que guardar (lo decide
// quien llama con el contexto): sin documento generado ni reporte «guardalo» sigue siendo lo de
// siempre en el backend (guardar el documento activo en la cuenta).
const SALIDA = re(`${PREFIJO}(compart\\w*|guard\\w*)(?:\\s+(?:me\\s+)?${DET}(?:\\w+\\s+){0,2}(?:documento|contrato|borrador|carta|archivo|pdf|word|reporte|informe)s?)?$`);
const SALIDA_REPORTE = re('\\b(?:reporte|informe)s?\\b');

const COMPARAR = re(`${PREFIJO}compar\\w*`);
const DIFERENCIAS_ENTRE_AMBOS = re('\\bdiferencias?\\b.*\\b(?:ambos|ambas|los dos|las dos|estos dos)\\b');

const CREAR = '(?:gener\\w*|redact\\w*|prepar\\w*|elabor\\w*|arm\\w*|crea\\w*|hac\\w*)';
// «generame un reporte» siempre pide uno nuevo; «mostrame el reporte» pide el que ya está,
// salvo que diga de qué («mostrame un reporte de riesgos»), que vuelve a ser uno nuevo.
const NUEVO_REPORTE = re(
  `${PREFIJO}(?:${CREAR}\\s+(?:me\\s+)?${DET}(?:\\w+\\s+){0,2}(?:reporte|informe)s?\\b|` +
  `(?:(?:mostr\\w*|muestr\\w*|dame|pasame)\\s+)?${DET}(?:\\w+\\s+){0,2}(?:reporte|informe)s?\\s+(?:de|sobre|con|por|del)\\b)`);
const GENERAR = re(
  `${PREFIJO}${CREAR}\\s+(?:me\\s+|nos\\s+)?(?:\\w+\\s+){0,3}(?:contrato|carta|documento|borrador|acuerdo|convenio|minuta|escrito|modelo)s?\\b`);
const CAMBIO_EN_GENERADO = re(
  `${PREFIJO}(?:cambi\\w*|modific\\w*|correg\\w*|agreg\\w*|anad\\w*|quit\\w*|elimin\\w*|pon\\w*|` +
  'actualiz\\w*|reemplaz\\w*|extend\\w*|reduc\\w*|alarg\\w*|sub\\w*|baj\\w*|complet\\w*)\\s+\\S+');
const AJUSTE_REPORTE = re(
  `${PREFIJO}(?:agreg\\w*|anad\\w*|quit\\w*|ordena\\w*|agrup\\w*|filtr\\w*|mostr\\w*|muestr\\w*|cambi\\w*|exporta\\w*|pasa\\w*)\\b`);
const PISTA_REPORTE = re(
  '\\b(?:grafico|barras|torta|tabla|columnas?|exporta\\w*|excel|powerpoint|de mayor a menor|' +
  'de menor a mayor|agrupad\\w+|agrupal\\w+|ordenal\\w+|ordenad\\w+|por (?:severidad|tipo|mes|area|estado))\\b');

// ── Mostrar lo que ya existe ────────────────────────────────────────────────────────
const VER = `${PREFIJO}(?:mostr\\w*|muestr\\w*|ver|veo|abr\\w*|ensen\\w*|deja(?:me)? ver|quiero ver|dame|pasame)\\s+(?:me\\s+|nos\\s+)?${DET}(?:\\w+\\s+){0,2}`;
const MOSTRAR: { que: ObjetoMostrable; patron: RegExp }[] = [
  { que: 'generado', patron: re(`${VER}(?:generad\\w+|borrador|carta|vista previa|documento generado)\\b`) },
  { que: 'comparacion', patron: re(`${VER}(?:comparacion|diferencias|comparativ\\w*)\\b`) },
  { que: 'reporte', patron: re(`${VER}(?:reporte|informe)s?\\b`) },
  { que: 'respuesta', patron: re(`${VER}(?:fuentes?|respuesta|conclusion|articulos (?:citados|utilizados|usados)|normas (?:citadas|utilizadas|usadas))\\b`) },
  { que: 'documento', patron: re(`${VER}(?:analisis|riesgos?|resumen|clausulas|${DOC})\\b`) },
];

const PANEL = re(
  `${PREFIJO}(cerr\\w*|ocult\\w*|minimiz\\w*|achic\\w*|expand\\w*|agrand\\w*|maximiz\\w*)\\s+${DET}(?:panel|ventana|resultado|vista|hoja)\\b`);

export function detectarIntencionLlamada(texto: string, ctx: ContextoIntencion): IntencionLlamada {
  const p = aPlano(texto);
  if (!p) return { tipo: 'consulta' };

  // 0. Una pregunta sobre la app misma. Va primero, pero solo calza con frases ANCLADAS que le hablan al
  //    asistente o nombran la app (`intencionAyuda.ts`): «¿qué puede hacer un acreedor?» sigue siendo consulta.
  //    Ninguna de esas frases es un dato plausible de una pregunta de la generación ni un «sí» o «no».
  const ayuda = detectarTemaAyuda(p, ctx);
  if (ayuda) return { tipo: 'ayuda', tema: ayuda };

  // 1. Una pregunta abierta de la generación por voz: lo que se diga responde a ella,
  //    salvo que sea cancelarla, pedir el documento ya u omitir el dato.
  if (ctx.flujo === 'generacion') {
    if (FLUJO_CANCELAR.test(p)) return { tipo: 'flujo', accion: 'cancelar' };
    if (FLUJO_GENERAR_YA.test(p)) return { tipo: 'flujo', accion: 'generar_ya' };
    if (FLUJO_OMITIR.test(p)) return { tipo: 'flujo', accion: 'omitir' };
    return { tipo: 'flujo', accion: 'responder' };
  }
  // Recordatorios. Primero lo que está esperando decisión («sí», «no», otra fecha); luego las
  // órdenes. Va antes que el resto: «cancelá el recordatorio» no es «cancelar la comparación».
  const decision = respuestaAPendiente(p, ctx);
  if (decision) return { tipo: 'recordatorio_respuesta', accion: decision };
  const recordatorio = accionDeRecordatorio(p, ctx);
  if (recordatorio) return { tipo: 'recordatorio', accion: recordatorio };
  if (esAjusteDePropuesta(p, ctx)) return { tipo: 'recordatorio_respuesta', accion: 'ajustar' };

  // La comparación espera que se elija el segundo documento en el panel; hablar sigue
  // sirviendo para todo lo demás, y cancelarla es lo único que ella misma entiende.
  if (ctx.flujo === 'comparacion' && FLUJO_CANCELAR.test(p)) return { tipo: 'flujo', accion: 'cancelar' };
  // Con un escaneo ya leído: «analizalo» es de ESE escaneo y «cancelar» lo descarta.
  if (ctx.flujo === 'escaneo' || ctx.recibido) {
    if (CANCELAR_PENDIENTE.test(p)) return { tipo: 'flujo', accion: 'cancelar' };
    if (ANALIZAR_PENDIENTE.test(p)) return ctx.recibido ? { tipo: 'analizar_recibido' } : { tipo: 'analizar_escaneo' };
  }

  // 2. El panel mismo.
  const panel = PANEL.exec(p);
  if (panel) {
    const verbo = panel[1];
    if (/^cerr/.test(verbo) || /^ocult/.test(verbo)) return { tipo: 'panel', accion: 'cerrar' };
    if (/^(?:minimiz|achic)/.test(verbo)) return { tipo: 'panel', accion: 'minimizar' };
    return { tipo: 'panel', accion: 'expandir' };
  }

  // 3. Mostrar lo que ya existe («mostrame el análisis», «ver las fuentes»).
  if (!NUEVO_REPORTE.test(p)) {
    for (const { que, patron } of MOSTRAR) if (patron.test(p)) return { tipo: 'mostrar', que };
  }

  // 4. Reportes: uno nuevo, o el ajuste del que está en pantalla.
  if (NUEVO_REPORTE.test(p)) return { tipo: 'reporte', ajuste: false };
  if (ctx.reporte && AJUSTE_REPORTE.test(p) && PISTA_REPORTE.test(p)) return { tipo: 'reporte', ajuste: true };

  // 4b. Guardar o compartir lo que se generó (solo si hay algo que guardar).
  const salida = SALIDA.exec(p);
  if (salida && (ctx.generado || ctx.reporte)) {
    const accion = /^compart/.test(salida[1]) ? 'guardar_o_compartir' : 'guardar';
    const objeto = SALIDA_REPORTE.test(p) ? 'reporte' : /(?:documento|contrato|borrador|carta|archivo|pdf|word)/.test(p) ? 'generado' : 'auto';
    if (objeto === 'reporte' ? ctx.reporte : objeto === 'generado' ? ctx.generado : true) {
      return { tipo: 'salida', accion: accion === 'guardar' ? 'guardar' : 'compartir', objeto };
    }
  }

  // 5a. Cámara: escanear un documento en papel o fotografiar una cláusula.
  if (ESCANEAR_VERBO.test(p) || USAR_CAMARA.test(p) || SACAR_FOTO.test(p)) {
    return { tipo: 'escanear', modo: ES_CLAUSULA.test(p) ? 'clausula' : 'documento' };
  }
  if (DOCUMENTO_EN_PAPEL.test(p)) return { tipo: 'escanear', modo: 'documento' };
  if (PREGUNTAR_POR_CLAUSULA.test(p)) return { tipo: 'escanear', modo: 'clausula' };

  // 5b. Documento activo: cerrarlo, cambiarlo, subir uno o analizarlo.
  if (CERRAR_DOCUMENTO.test(p)) return { tipo: 'cerrar_documento' };
  if (SUBIR.test(p) || SUBIR_OTRO.test(p) || CAMBIAR.test(p)) return { tipo: 'subir_documento' };
  const analizar = ANALIZAR.exec(p);
  if (analizar) {
    // «Quiero revisar UN contrato» pide otro; «revisá EL contrato» habla del activo. Sin
    // documento activo no hay a qué referirse: se pide el archivo.
    const indefinido = /^(?:un|una|otro|otra)\s*$/.test((analizar[1] || '').trim());
    return ctx.documentoActivo && !indefinido ? { tipo: 'analizar_documento' } : { tipo: 'subir_documento' };
  }

  // 6. Comparar documentos.
  if (COMPARAR.test(p) && new RegExp(`\\b(?:${DOC}|ambos|otro|otra|dos|este|estos)\\b`).test(p)) return { tipo: 'comparar' };
  if (DIFERENCIAS_ENTRE_AMBOS.test(p)) return { tipo: 'comparar' };

  // 7. Un cambio sobre el documento generado («cambiá el plazo a 18 meses»).
  if (ctx.generado && CAMBIO_EN_GENERADO.test(p) && !(ctx.reporte && PISTA_REPORTE.test(p))) {
    return { tipo: 'modificar_generado' };
  }

  // 8. Generar un documento nuevo.
  if (GENERAR.test(p)) return { tipo: 'generar_documento' };

  // Todo lo demás es una consulta: el flujo jurídico de siempre.
  return { tipo: 'consulta' };
}
