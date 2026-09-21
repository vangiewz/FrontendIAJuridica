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
  /**
   * Si se da, el artículo se abre con esto en vez de navegar a su pantalla: la llamada lo
   * usa para mostrarlo dentro de su panel sin salir de ella.
   */
  alAbrirArticulo?: (codigo: string, numero: number) => void;
}

export function ListaFuentes({ fuentes, areaDetectada, alAbrirArticulo }: Props) {
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
            if (alAbrirArticulo) { alAbrirArticulo(f.codigo, f.numero_articulo); return; }
            router.push(`/(app)/articulo?codigo=${encodeURIComponent(f.codigo)}&numero=${f.numero_articulo}`);
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
