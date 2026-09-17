import React from 'react';
import { View, Text, TextInput, StyleSheet, TextInputProps } from 'react-native';
import { colores, tipografia, espaciado, radios } from '../../theme';

interface Props extends TextInputProps {
  label: string;
  error?: string;
}

export function CampoTexto({ label, error, style, ...props }: Props) {
  return (
    <View style={[styles.contenedor, style]}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, error && styles.inputError]}
        placeholderTextColor={colores.tintaSuave}
        {...props}
      />
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    marginBottom: espaciado.m,
  },
  label: {
    fontFamily: tipografia.familias.cuerpoFuerte,
    fontSize: tipografia.escala.nota,
    color: colores.tinta,
    marginBottom: espaciado.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: colores.linea,
    borderRadius: radios.s,
    padding: espaciado.m,
    fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.escala.cuerpo,
    color: colores.tinta,
    backgroundColor: colores.superficie,
  },
  inputError: {
    borderColor: colores.alerta,
  },
  error: {
    fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.escala.nota,
    color: colores.alerta,
    marginTop: espaciado.xs,
  },
});
