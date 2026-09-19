import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colores, espaciado, radios, tipografia } from '../../theme';
import { TipoDocumento, describirTipoDocumento } from '../../models/documentos';

interface Props {
  tipo: TipoDocumento | null;
}

/** El tipo documental que asigno el backend, destacado: es el resultado de HU-08. */
export function EtiquetaTipoDocumento({ tipo }: Props) {
  const { etiqueta, identificado } = describirTipoDocumento(tipo);

  return (
    <View style={[styles.bloque, !identificado && styles.bloqueSinIdentificar]}>
      <Text style={styles.rotulo}>TIPO DE DOCUMENTO</Text>
      <Text style={[styles.valor, !identificado && styles.valorSinIdentificar]}>{etiqueta}</Text>
      {!identificado ? (
        <Text style={styles.nota}>
          El documento se procesó, pero su contenido no coincide con ninguno de los tipos
          civiles que el sistema reconoce.
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bloque: {
    backgroundColor: colores.papel,
    borderLeftWidth: 4,
    borderLeftColor: colores.accion,
    borderRadius: radios.s,
    paddingVertical: espaciado.m,
    paddingHorizontal: espaciado.m,
    marginBottom: espaciado.m,
  },
  bloqueSinIdentificar: {
    borderLeftColor: colores.tintaSuave,
  },
  rotulo: {
    fontFamily: tipografia.familias.cuerpoFuerte,
    fontSize: tipografia.escala.nota,
    color: colores.tintaSuave,
    letterSpacing: 1,
    marginBottom: espaciado.xs,
  },
  valor: {
    fontFamily: tipografia.familias.titulo,
    fontSize: tipografia.escala.subtitulo,
    color: colores.accion,
  },
  valorSinIdentificar: {
    fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.escala.cuerpo,
    color: colores.tintaSuave,
  },
  nota: {
    fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.escala.nota,
    color: colores.tintaSuave,
    lineHeight: 20,
    marginTop: espaciado.s,
  },
});
