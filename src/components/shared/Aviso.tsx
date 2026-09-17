import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colores, tipografia, espaciado, radios } from '../../theme';

interface Props {
  mensaje: string;
  tipo?: 'error' | 'info';
}

export function Aviso({ mensaje, tipo = 'info' }: Props) {
  const isError = tipo === 'error';
  return (
    <View style={[styles.contenedor, isError && styles.contenedorError]}>
      <Text style={[styles.texto, isError && styles.textoError]}>{mensaje}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    backgroundColor: colores.linea,
    padding: espaciado.m,
    borderRadius: radios.s,
    marginBottom: espaciado.m,
  },
  contenedorError: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colores.alerta,
  },
  texto: {
    fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.escala.nota,
    color: colores.tinta,
  },
  textoError: {
    color: colores.alerta,
  },
});
