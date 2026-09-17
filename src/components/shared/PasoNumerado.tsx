import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colores, tipografia, espaciado } from '../../theme';

interface Props {
  numero: number;
}

export function PasoNumerado({ numero }: Props) {
  return (
    <View style={styles.contenedor}>
      <Text style={styles.texto}>{numero}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    marginRight: espaciado.m,
  },
  texto: {
    fontFamily: tipografia.familias.titulo,
    fontSize: tipografia.escala.numeral,
    color: colores.destacado,
    lineHeight: tipografia.escala.numeral,
  },
});
