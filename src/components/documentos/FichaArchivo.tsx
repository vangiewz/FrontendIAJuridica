import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colores, espaciado, radios, tipografia } from '../../theme';
import { ArchivoSeleccionado, formatearTamano } from '../../models/documentos';

interface Props {
  archivo: ArchivoSeleccionado;
}

/** El archivo elegido, antes de enviarlo: que se va a subir exactamente. */
export function FichaArchivo({ archivo }: Props) {
  const tamano = formatearTamano(archivo.tamano);
  const extension = archivo.extension.replace('.', '').toUpperCase();

  return (
    <View style={styles.card}>
      <Text style={styles.rotulo}>Archivo seleccionado</Text>
      <Text style={styles.nombre} numberOfLines={2}>{archivo.nombre}</Text>
      <View style={styles.meta}>
        <Text style={styles.metaTexto}>{extension}</Text>
        {tamano ? <Text style={styles.metaTexto}>{tamano}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colores.superficie,
    borderWidth: 1,
    borderColor: colores.linea,
    borderRadius: radios.m,
    padding: espaciado.l,
    marginBottom: espaciado.l,
  },
  rotulo: {
    fontFamily: tipografia.familias.cuerpoFuerte,
    fontSize: tipografia.escala.nota,
    color: colores.tintaSuave,
    marginBottom: espaciado.xs,
  },
  nombre: {
    fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.escala.cuerpo,
    color: colores.tinta,
    marginBottom: espaciado.m,
  },
  meta: {
    flexDirection: 'row',
    gap: espaciado.m,
  },
  metaTexto: {
    fontFamily: tipografia.familias.cuerpoFuerte,
    fontSize: tipografia.escala.nota,
    color: colores.accion,
  },
});
