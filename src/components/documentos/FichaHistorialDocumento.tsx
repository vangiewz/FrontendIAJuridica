import React from 'react';
import { TouchableOpacity, Text, View, StyleSheet } from 'react-native';
import { colores, espaciado, radios, tipografia } from '../../theme';
import { ItemDocumento, describirTipoDocumento } from '../../models/documentos';

interface Props {
  item: ItemDocumento;
  onPress: () => void;
}

export function FichaHistorialDocumento({ item, onPress }: Props) {
  const { etiqueta } = describirTipoDocumento(item.tipo_documento);
  const fallido = item.estado === 'fallido';

  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.8} onPress={onPress}>
      <Text style={[styles.tipo, fallido && styles.tipoFallido]}>
        {fallido ? 'No se pudo leer' : etiqueta}
      </Text>
      <Text style={styles.nombre} numberOfLines={2}>{item.nombre_archivo}</Text>
      <View style={styles.pie}>
        <Text style={styles.meta}>{new Date(item.subido_en).toLocaleDateString()}</Text>
        <Text style={styles.meta}>{item.estado}</Text>
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
  tipo: {
    fontFamily: tipografia.familias.cuerpoFuerte,
    fontSize: tipografia.escala.nota,
    color: colores.accion,
    marginBottom: espaciado.xs,
  },
  tipoFallido: {
    color: colores.destacado,
  },
  nombre: {
    fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.escala.cuerpo,
    color: colores.tinta,
    marginBottom: espaciado.m,
  },
  pie: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  meta: {
    fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.escala.nota,
    color: colores.tintaSuave,
    textTransform: 'capitalize',
  },
});
