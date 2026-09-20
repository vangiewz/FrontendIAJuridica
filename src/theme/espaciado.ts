export const espaciado = {
  xs: 4,
  s: 8,
  m: 16,
  l: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radios = {
  s: 4,
  m: 8,
  l: 16,
  xl: 24,
  round: 9999,
} as const;

// Anchos maximos de columna. En la cartilla el margen ancho es parte del sistema:
// el texto no se estira a lo ancho de un monitor, se lee en columna.
export const anchos = {
  formulario: 400,   // login, registro, listas
  panel: 600,        // perfil y pantallas de datos
  lectura: 800,      // contenido corrido y respuestas
  // El constructor de reportes es una herramienta, no un texto: necesita el monitor
  // entero para que las dos columnas de campos entren sin apretarse.
  herramienta: 1400,
} as const;

// Alturas fijas que no derivan de la escala de espaciado.
export const alturas = {
  campoConsulta: 200,  // el campo abierto del primer viewport
} as const;

// Interlineado para lectura corrida. El cuerpo es 17px: 24 da el aire que
// necesita un texto legal leido por alguien sin formacion juridica.
export const interlineado = {
  cuerpo: 24,
} as const;
