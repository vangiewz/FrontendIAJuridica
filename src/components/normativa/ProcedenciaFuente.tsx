import React from 'react';
import { View, Text, StyleSheet, Linking, TouchableOpacity } from 'react-native';
import { EstadoVigencia } from '../../models/consultas';
import { SelloVigencia } from '../consultas/SelloVigencia';
import { colores, radios, espaciado, tipografia, interlineado } from '../../theme';

interface Props {
  fuenteNombre: string;
  fuenteUrl: string;
  estado: EstadoVigencia;
  nota: string | null;
}

export function ProcedenciaFuente({ fuenteNombre, fuenteUrl, estado, nota }: Props) {
  return (
    <View style={styles.contenedor}>
      <Text style={styles.etiqueta}>De dónde sale este texto</Text>
      
      <TouchableOpacity onPress={() => Linking.openURL(fuenteUrl)} activeOpacity={0.8}>
        <Text style={styles.enlace}>{fuenteNombre}</Text>
      </TouchableOpacity>

      <View style={styles.selloContenedor}>
        <SelloVigencia estado={estado} />
      </View>
      
      {nota && (
        <Text style={styles.nota}>{nota}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    backgroundColor: colores.superficie,
    borderColor: colores.linea,
    borderWidth: 1,
    borderRadius: radios.m,
    padding: espaciado.l,
    marginTop: espaciado.xl,
  },
  etiqueta: {
    fontFamily: tipografia.familias.cuerpoFuerte,
    fontSize: tipografia.escala.nota,
    color: colores.tintaSuave,
    marginBottom: espaciado.xs,
  },
  enlace: {
    fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.escala.cuerpo,
    color: colores.accion,
    marginBottom: espaciado.m,
  },
  selloContenedor: {
    alignSelf: 'flex-start',
    marginBottom: espaciado.s,
  },
  nota: {
    fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.escala.nota,
    lineHeight: interlineado.cuerpo,
    color: colores.tinta,
    marginTop: espaciado.s,
  },
});
