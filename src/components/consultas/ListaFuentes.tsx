import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { FuenteLegal, AreaJuridica } from '../../models/consultas';
import { FichaFuente } from './FichaFuente';
import { colores, tipografia, espaciado } from '../../theme';

interface Props {
  fuentes: FuenteLegal[];
  areaDetectada: AreaJuridica | null;
}

export function ListaFuentes({ fuentes, areaDetectada }: Props) {
  if (fuentes.length === 0) return null;
  
  const mapAreaToCamel: Record<string, keyof typeof colores.areas> = {
    contratos: 'contratos',
    obligaciones: 'obligaciones',
    derechos_reales: 'derechosReales',
    sucesiones: 'sucesiones',
  };
  const colorArea = areaDetectada && mapAreaToCamel[areaDetectada] ? colores.areas[mapAreaToCamel[areaDetectada]] : undefined;

  return (
    <View style={styles.contenedor}>
      <Text style={styles.recuento}>
        {fuentes.length} {fuentes.length === 1 ? 'artículo' : 'artículos'} del Código Civil
      </Text>
      {fuentes.map((f, i) => (
        <FichaFuente key={i} fuente={f} colorArea={colorArea} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    marginTop: espaciado.xl,
  },
  recuento: {
    fontFamily: tipografia.familias.cuerpoFuerte,
    fontSize: tipografia.escala.nota,
    color: colores.tintaSuave,
    marginBottom: espaciado.m,
  },
});
