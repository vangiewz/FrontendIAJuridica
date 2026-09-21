/**
 * Piezas comunes de las reglas de intención de la llamada (ver `intencion.ts`). Lógica pura.
 */

// Cortesías y muletillas que pueden preceder al verbo sin cambiar lo que se pide.
export const PREFIJO =
  '^(?:(?:por favor|ahora|y|entonces|pero|bueno|ok|dale|quiero(?: que)?|necesito(?: que)?|' +
  'me gustaria(?: que)?|quisiera|podes|podrias|puedes|vamos a|voy a|hola)\\s+)*(?:(?:me|nos|te)\\s+)?';

export const DOC = '(?:documento|contrato|archivo|pdf|word|docx|acuerdo|convenio)s?';
export const DET = '(?:(?:el|la|los|las|mi|mis|este|esta|estos|estas|ese|esa|un|una|otro|otra|tu)\\s+)?';

export const re = (cuerpo: string) => new RegExp(cuerpo);
