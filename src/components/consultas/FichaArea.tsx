import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { colores, tipografia, espaciado, radios } from '../../theme';
import { AreaJuridica } from '../../models/consultas';
import { colorDeArea } from '../../theme/areas';

interface Props {
  area: AreaJuridica;
  titulo: string;
  activa: boolean;
  onPress?: () => void;
}

export function FichaArea({ area, titulo, activa, onPress }: Props) {
  const colorArea = colorDeArea(area) || colores.linea;
  
  const contenido = (
    <View style={[
      styles.ficha,
      activa ? { backgroundColor: colorArea } : styles.fichaInactiva
    ]}>
      <Text style={[
        styles.texto,
        activa ? styles.textoActivo : styles.textoInactivo
      ]}>
        {titulo}
      </Text>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.8}
      >
        {contenido}
      </TouchableOpacity>
    );
  }

  return contenido;
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
