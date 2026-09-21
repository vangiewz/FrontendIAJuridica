import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colores, espaciado, radios, tipografia } from '../../theme';

export type TonoSello = 'espera' | 'fallo';

export function SelloEstado({ texto, tono }: { texto: string; tono: TonoSello }) {
  return (
    <View style={[styles.contenedor, tono === 'fallo' && styles.contenedorFallo]}>
      <Text style={[styles.texto, tono === 'fallo' && styles.textoFallo]}>{texto}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    borderRadius: radios.m,
    paddingVertical: espaciado.xs,
    paddingHorizontal: espaciado.s,
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: colores.destacado,
    alignSelf: 'flex-start',
  },
  contenedorFallo: {
    backgroundColor: 'transparent',
    borderColor: colores.alerta,
  },
  texto: {
    fontFamily: tipografia.familias.cuerpoFuerte,
    fontSize: tipografia.escala.nota,
    color: colores.tinta,
  },
  textoFallo: {
    color: colores.alerta,
  },
});

