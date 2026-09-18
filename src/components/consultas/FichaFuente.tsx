import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { FuenteLegal } from '../../models/consultas';
import { colores, radios, espaciado, tipografia, interlineado } from '../../theme';
import { SelloVigencia } from './SelloVigencia';

interface Props {
  fuente: FuenteLegal;
  colorArea?: string;
}

export function FichaFuente({ fuente, colorArea }: Props) {
  const borderColor = colorArea || colores.linea;

  return (
    <View style={styles.contenedor}>
      <View style={[styles.regla, { backgroundColor: borderColor }]} />
      <View style={styles.contenido}>
        <Text style={styles.titulo}>Art. {fuente.numero_articulo}</Text>
        {fuente.epigrafe ? (
          <Text style={styles.epigrafe}>{fuente.epigrafe.toUpperCase()}</Text>
        ) : null}
        <Text style={styles.texto} numberOfLines={6}>
          {fuente.texto_citado}
        </Text>
        <View style={styles.footer}>
          <SelloVigencia estado={fuente.estado_vigencia} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    backgroundColor: colores.superficie,
    borderColor: colores.linea,
    borderWidth: 1,
    borderRadius: radios.m,
    flexDirection: 'row',
    overflow: 'hidden',
    marginBottom: espaciado.m,
  },
  regla: {
    width: 3,
  },
  contenido: {
    flex: 1,
    padding: espaciado.l,
  },
  titulo: {
    fontFamily: tipografia.familias.titulo,
    fontSize: tipografia.escala.subtitulo,
    color: colores.tinta,
    marginBottom: espaciado.xs,
  },
  epigrafe: {
    fontFamily: tipografia.familias.cuerpoFuerte,
    fontSize: tipografia.escala.nota,
    color: colores.tintaSuave,
    marginBottom: espaciado.m,
  },
  texto: {
    fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.escala.cuerpo,
    lineHeight: interlineado.cuerpo,
    color: colores.tinta,
    marginBottom: espaciado.l,
  },
  footer: {
    flexDirection: 'row',
  },
});
