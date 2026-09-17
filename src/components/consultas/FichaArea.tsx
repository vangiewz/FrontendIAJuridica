import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { colores, tipografia, espaciado, radios } from '../../theme';
import { AreaJuridica } from '../../models/consultas';

interface Props {
  area: AreaJuridica;
  titulo: string;
  activa: boolean;
  onPress: () => void;
}

export function FichaArea({ area, titulo, activa, onPress }: Props) {
  const colorArea = colores.areas[area];
  
  return (
    <TouchableOpacity
      style={[
        styles.ficha,
        activa ? { backgroundColor: colorArea } : styles.fichaInactiva
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={[
        styles.texto,
        activa ? styles.textoActivo : styles.textoInactivo
      ]}>
        {titulo}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  ficha: {
    paddingVertical: espaciado.s,
    paddingHorizontal: espaciado.m,
    borderRadius: radios.m,
    marginRight: espaciado.s,
    marginBottom: espaciado.s,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  fichaInactiva: {
    backgroundColor: 'transparent',
    borderColor: colores.linea,
  },
  texto: {
    fontFamily: tipografia.familias.cuerpoFuerte,
    fontSize: tipografia.escala.nota,
  },
  textoActivo: {
    color: colores.superficie,
  },
  textoInactivo: {
    color: colores.tintaSuave,
  },
});
