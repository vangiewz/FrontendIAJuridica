import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colores, espaciado, radios, tipografia } from '../../theme';
import { colorDeSerie } from './paleta';

export interface PuntoGrafico {
  etiqueta: string;
  valor: number;
}

interface Props {
  datos: PuntoGrafico[];
  tituloValor: string;
}

/**
 * Barras horizontales dibujadas con vistas: el largo es proporcional al valor real, no
 * hay imagen generada ni libreria de graficos. Se leen igual en web y en el telefono,
 * y las etiquetas largas (nombres de archivo) no se pisan como en un grafico vertical.
 */
export function GraficoBarras({ datos, tituloValor }: Props) {
  const maximo = Math.max(...datos.map((d) => d.valor), 0);
  if (maximo <= 0) {
    return <Text style={styles.vacio}>No hay valores para graficar.</Text>;
  }

  return (
    <View>
      <Text style={styles.leyenda}>{tituloValor}</Text>
      {datos.map((punto, indice) => (
        <View key={`${punto.etiqueta}-${indice}`} style={styles.fila}>
          <Text style={styles.etiqueta} numberOfLines={2}>
            {punto.etiqueta}
          </Text>
          <View style={styles.pista}>
            <View
              style={[
                styles.barra,
                {
                  // El ancho minimo deja ver la barra aunque el valor sea muy chico.
                  width: `${Math.max((punto.valor / maximo) * 100, 1)}%`,
                  backgroundColor: colorDeSerie(indice),
                },
              ]}
            />
          </View>
          <Text style={styles.valor}>{punto.valor}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  fila: { flexDirection: 'row', alignItems: 'center', marginBottom: espaciado.s },
  etiqueta: {
    width: 130,
    fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.escala.nota,
    color: colores.tinta,
    paddingRight: espaciado.s,
  },
  pista: {
    flex: 1,
    height: 22,
    backgroundColor: colores.papel,
    borderRadius: radios.s,
    borderWidth: 1,
    borderColor: colores.linea,
    overflow: 'hidden',
  },
  barra: { height: '100%', borderRadius: radios.s },
  valor: {
    width: 56,
    textAlign: 'right',
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
