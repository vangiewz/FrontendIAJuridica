import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colores, espaciado, radios, tipografia } from '../../theme';
import { colorDeSerie } from './paleta';
import { PuntoGrafico } from './GraficoBarras';

interface Props {
  datos: PuntoGrafico[];
  tituloValor: string;
}

/**
 * El reparto del total, como banda proporcional con su leyenda en porcentajes.
 *
 * Es lo que se muestra cuando se pide un grafico circular: dice exactamente lo mismo
 * que una torta (que parte del total se lleva cada categoria) y se dibuja con vistas,
 * sin sumar una dependencia nativa de graficos al proyecto.
 */
export function GraficoProporciones({ datos, tituloValor }: Props) {
  const total = datos.reduce((suma, punto) => suma + punto.valor, 0);
  if (total <= 0) {
    return <Text style={styles.vacio}>No hay valores para graficar.</Text>;
  }

  const porcentaje = (valor: number) => (valor / total) * 100;

  return (
    <View>
      <Text style={styles.leyenda}>
        {tituloValor} · total {total}
      </Text>
      <View style={styles.banda}>
        {datos.map((punto, indice) => (
          <View
            key={`${punto.etiqueta}-${indice}`}
            style={{
              width: `${porcentaje(punto.valor)}%`,
              backgroundColor: colorDeSerie(indice),
            }}
          />
        ))}
      </View>
      {datos.map((punto, indice) => (
        <View key={`leyenda-${punto.etiqueta}-${indice}`} style={styles.item}>
          <View style={[styles.punto, { backgroundColor: colorDeSerie(indice) }]} />
          <Text style={styles.texto} numberOfLines={2}>
            {punto.etiqueta}
          </Text>
          <Text style={styles.cifra}>
            {punto.valor} · {porcentaje(punto.valor).toFixed(1)}%
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  banda: {
    flexDirection: 'row',
    height: 28,
    borderRadius: radios.s,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colores.linea,
    marginBottom: espaciado.m,
  },
  item: { flexDirection: 'row', alignItems: 'center', marginBottom: espaciado.xs },
  punto: { width: 12, height: 12, borderRadius: radios.round, marginRight: espaciado.s },
  texto: {
    flex: 1,
    fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.escala.nota,
    color: colores.tinta,
  },
  cifra: {
    fontFamily: tipografia.familias.cuerpoFuerte,
    fontSize: tipografia.escala.nota,
    color: colores.tinta,
  },
  leyenda: {
    fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.escala.nota,
    color: colores.tintaSuave,
    marginBottom: espaciado.s,
  },
  vacio: {
    fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.escala.nota,
    color: colores.tintaSuave,
  },
});
