import { analizarTexto } from '../../components/consultas/analizarTexto';

/**
 * Prepara la respuesta escrita para leerla en voz alta. Funciones puras: no dependen de
 * ningún módulo nativo, así que se pueden probar solas.
 *
 * Lo que se lee es solo el contenido útil. Los identificadores internos del sistema
 * (F1, F1C2), los enlaces y los marcadores de formato no significan nada al oído.
 */

const punto = (texto: string) => (/[.!?:;…]$/.test(texto) ? texto : `${texto}.`);

export function limpiarParaVoz(texto: string): string {
  return texto
    .replace(/\bF[1-9]\d*(?:C[1-9]\d*)?\b/g, '')          // ids internos de fragmentos
    .replace(/https?:\/\/\S+/gi, '')                        // enlaces
    .replace(/\barts\.\s*(?=\d)/gi, 'artículos ')          // «arts. 3 y 4»
    .replace(/\bart\.\s*(?=\d)/gi, 'artículo ')             // «art. 341»
    .replace(/\bnº\s*/gi, 'número ')
    .replace(/[*_#`>|~]+/g, '')                             // restos de formato
    .replace(/\(\s*[,;\s]*\)/g, '')                         // paréntesis que quedaron vacíos
    .replace(/[ \t]+([,.;:!?])/g, '$1')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Los títulos y las viñetas terminan en punto para que la voz haga una pausa. */
export function textoParaLectura(texto: string): string {
  const partes = analizarTexto(texto || '').map((bloque) =>
    bloque.tipo === 'parrafo' ? bloque.texto : punto(bloque.texto));
  return limpiarParaVoz(partes.join('\n\n'));
}

/**
 * Parte el texto en tramos que el motor de voz acepta (Android limita cada llamada).
 * Corta en párrafos y, si un párrafo es demasiado largo, en oraciones; solo como último
 * recurso corta en un espacio. Nunca a mitad de palabra.
 */
export function dividirEnTramos(texto: string, maximo = 3000): string[] {
  const limite = Math.max(200, maximo);
  const tramos: string[] = [];
  let actual = '';
  const volcar = () => { if (actual.trim()) tramos.push(actual.trim()); actual = ''; };
  const agregar = (pieza: string, separador: string) => {
    if (actual && actual.length + separador.length + pieza.length > limite) volcar();
    actual = actual ? `${actual}${separador}${pieza}` : pieza;
  };

  for (const parrafo of texto.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean)) {
    if (parrafo.length <= limite) { agregar(parrafo, '\n\n'); continue; }
    for (const oracion of parrafo.split(/(?<=[.!?])\s+/)) {
      if (oracion.length <= limite) { agregar(oracion, ' '); continue; }
      let resto = oracion;
      while (resto.length > limite) {
        const corte = resto.lastIndexOf(' ', limite);
        const en = corte > limite / 2 ? corte : limite;
        agregar(resto.slice(0, en).trim(), ' ');
        volcar();
        resto = resto.slice(en).trim();
      }
      if (resto) agregar(resto, ' ');
    }
  }
  volcar();
  return tramos;
}
