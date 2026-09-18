import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colores, espaciado, radios, tipografia, anchos } from '../../theme';

export function EsqueletoLectura() {
  return (
    <View style={styles.contenedor}>
      <View style={styles.miga} />
      <View style={styles.numeral} />
      <View style={styles.codigo} />
      <View style={styles.epigrafe} />
      <View style={styles.parrafo} />
      <View style={styles.parrafoCorto} />
      <View style={styles.parrafo} />
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    padding: espaciado.xl,
    maxWidth: anchos.panel,
    width: '100%',
    alignSelf: 'center',
  },
  bloqueBase: {
    backgroundColor: colores.linea,
    borderRadius: radios.s,
  },
  miga: {
    backgroundColor: colores.linea,
    borderRadius: radios.s,
    height: tipografia.escala.nota,
    width: '60%',
    marginBottom: espaciado.xl,
  },
  numeral: {
    backgroundColor: colores.linea,
    borderRadius: radios.s,
    height: tipografia.escala.numeral,
    width: '30%',
    marginBottom: espaciado.xs,
  },
  codigo: {
    backgroundColor: colores.linea,
    borderRadius: radios.s,
    height: tipografia.escala.nota,
    width: '40%',
    marginBottom: espaciado.xl,
  },
  epigrafe: {
    backgroundColor: colores.linea,
    borderRadius: radios.s,
    height: tipografia.escala.titulo,
    width: '50%',
    marginBottom: espaciado.l,
  },
  parrafo: {
    backgroundColor: colores.linea,
    borderRadius: radios.s,
    height: tipografia.escala.cuerpo,
    width: '100%',
    marginBottom: espaciado.s,
  },
  parrafoCorto: {
    backgroundColor: colores.linea,
    borderRadius: radios.s,
    height: tipografia.escala.cuerpo,
    width: '80%',
    marginBottom: espaciado.m,
  },
});
