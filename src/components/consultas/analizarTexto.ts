export type Bloque = { tipo: 'titulo' | 'parrafo' | 'vineta'; texto: string };

const TITULO_MARCADO = /^\s*(?:\*\*(.+?)\*\*|#{1,6}\s+(.+?))\s*:?\s*$/;
const TITULO_MAYUSCULAS = /^[^a-záéíóúñ]{3,60}$/;
const VINETA = /^\s*(?:[-*•]|\d+[.)])\s+(.*)$/;

/** Quita los marcadores de énfasis: el estilo lo pone la hoja de estilos, no el texto. */
const limpiar = (linea: string) => linea.replace(/\*\*(.+?)\*\*/g, '$1').replace(/\s+/g, ' ').trim();

/**
 * Convierte la respuesta del asistente en bloques legibles.
 *
 * El modelo escribe en párrafos separados por una línea en blanco y a veces encabeza
 * cada tramo con un título corto. Sin esto todo llega como un solo muro de texto con
 * asteriscos a la vista.
 */
export function analizarTexto(texto: string): Bloque[] {
  const bloques: Bloque[] = [];
  let parrafo: string[] = [];
  const cerrar = () => {
    if (parrafo.length) bloques.push({ tipo: 'parrafo', texto: parrafo.join(' ') });
    parrafo = [];
  };
  for (const linea of (texto || '').split('\n')) {
    if (!linea.trim()) { cerrar(); continue; }
    const marcado = linea.match(TITULO_MARCADO);
    const vineta = linea.match(VINETA);
    const limpia = limpiar(linea);
    if (marcado) {
      cerrar();
      bloques.push({ tipo: 'titulo', texto: limpiar(marcado[1] ?? marcado[2] ?? '') });
    } else if (TITULO_MAYUSCULAS.test(limpia) && limpia.length <= 60) {
      cerrar();
      bloques.push({ tipo: 'titulo', texto: limpia });
    } else if (vineta) {
      cerrar();
      bloques.push({ tipo: 'vineta', texto: limpiar(vineta[1]) });
    } else {
      parrafo.push(limpia);
    }
  }
  cerrar();
  return bloques;
}
