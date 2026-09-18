import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ubicacion } from '../../models/normativa';
import { tipografia, colores, espaciado } from '../../theme';

interface Props {
  ubicacion: Ubicacion;
}

export function MigaJuridica({ ubicacion }: Props) {
  const partes = [
    ubicacion.libro,
    ubicacion.parte,
    ubicacion.titulo,
    ubicacion.capitulo,
    ubicacion.seccion
  ].filter((p): p is string => p !== null);

  if (partes.length === 0) return null;

  return (
    <View style={styles.contenedor}>
      <Text style={styles.texto}>
        {partes.join(' › ')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    marginBottom: espaciado.l,
  },
  texto: {
    fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.escala.nota,
    color: colores.tintaSuave,
  },
});
