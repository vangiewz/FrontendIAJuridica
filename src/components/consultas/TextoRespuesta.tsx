import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colores, espaciado, interlineado, tipografia } from '../../theme';
import { analizarTexto } from './analizarTexto';

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
          <Text style={[styles.parrafo, styles.flexible]} selectable>{bloque.texto}</Text>
        </View>
      ) : (
        <Text key={i} style={styles.parrafo} selectable>{bloque.texto}</Text>
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
