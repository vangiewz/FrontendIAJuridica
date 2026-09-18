import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { FuenteLegal, AreaJuridica } from '../../models/consultas';
import { FichaFuente } from './FichaFuente';
import { colores, tipografia, espaciado } from '../../theme';
import { colorDeArea } from '../../theme/areas';

interface Props {
  fuentes: FuenteLegal[];
  areaDetectada: AreaJuridica | null;
}

export function ListaFuentes({ fuentes, areaDetectada }: Props) {
  if (fuentes.length === 0) return null;
  
  const colorArea = colorDeArea(areaDetectada);

  return (
    <View style={styles.contenedor}>
      <Text style={styles.recuento}>
        {fuentes.length} {fuentes.length === 1 ? 'artículo' : 'artículos'} del Código Civil
      </Text>
      {fuentes.map((f, i) => (
        <FichaFuente
          key={i}
          fuente={f}
          colorArea={colorArea}
          alPulsar={() => {
            router.push(`/articulo?codigo=${encodeURIComponent(f.codigo)}&numero=${f.numero_articulo}`);
          }}
        />
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
