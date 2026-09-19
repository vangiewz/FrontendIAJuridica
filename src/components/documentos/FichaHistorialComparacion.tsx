import React from 'react';
import { TouchableOpacity, Text, View, StyleSheet } from 'react-native';
import { colores, espaciado, radios, tipografia } from '../../theme';
import { ItemComparacion } from '../../models/documentos';

interface Props {
  item: ItemComparacion;
  onPress: () => void;
}

export function FichaHistorialComparacion({ item, onPress }: Props) {
  const cambios = item.cantidad_cambios;

  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.8} onPress={onPress}>
      <Text style={styles.nombre} numberOfLines={1}>{item.nombre_a}</Text>
      <Text style={styles.versus}>vs</Text>
      <Text style={styles.nombre} numberOfLines={1}>{item.nombre_b}</Text>

      <View style={styles.pie}>
        <Text style={styles.meta}>{new Date(item.creada_en).toLocaleDateString()}</Text>
        <Text style={styles.cambios}>
          {cambios === 0
            ? 'Sin diferencias'
            : `${cambios} ${cambios === 1 ? 'cambio' : 'cambios'}`}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colores.superficie,
    borderWidth: 1,
    borderColor: colores.linea,
    borderRadius: radios.m,
    padding: espaciado.l,
    marginBottom: espaciado.m,
  },
  nombre: {
    fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.escala.cuerpo,
    color: colores.tinta,
  },
  versus: {
    fontFamily: tipografia.familias.cuerpoFuerte,
    fontSize: tipografia.escala.nota,
    color: colores.tintaSuave,
    marginVertical: espaciado.xs,
  },
  pie: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: espaciado.m,
  },
  meta: {
    fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.escala.nota,
    color: colores.tintaSuave,
  },
  cambios: {
    fontFamily: tipografia.familias.cuerpoFuerte,
    fontSize: tipografia.escala.nota,
    color: colores.accion,
  },
});
