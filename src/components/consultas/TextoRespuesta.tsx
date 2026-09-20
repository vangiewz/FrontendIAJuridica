import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colores, espaciado, interlineado, tipografia } from '../../theme';

type Bloque = { tipo: 'titulo' | 'parrafo' | 'vineta'; texto: string };

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

export function TextoRespuesta({ texto }: { texto: string }) {
  const bloques = analizarTexto(texto);
  if (!bloques.length) return null;
  return (
    <View style={styles.contenedor}>
      {bloques.map((bloque, i) => bloque.tipo === 'titulo' ? (
        <Text key={i} style={[styles.titulo, i > 0 && styles.tituloSeparado]}>{bloque.texto}</Text>
      ) : bloque.tipo === 'vineta' ? (
        <View key={i} style={styles.fila}>
          <Text style={styles.punto}>•</Text>
          <Text style={[styles.parrafo, styles.flexible]}>{bloque.texto}</Text>
        </View>
      ) : (
        <Text key={i} style={styles.parrafo}>{bloque.texto}</Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { gap: espaciado.s },
  parrafo: { color: colores.tinta, fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.escala.cuerpo, lineHeight: interlineado.cuerpo },
  titulo: { color: colores.tinta, fontFamily: tipografia.familias.cuerpoFuerte,
    fontSize: tipografia.escala.cuerpo },
  tituloSeparado: { marginTop: espaciado.xs },
  fila: { flexDirection: 'row', gap: espaciado.xs },
  punto: { color: colores.tintaSuave, fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.escala.cuerpo, lineHeight: interlineado.cuerpo },
  flexible: { flex: 1 },
});
