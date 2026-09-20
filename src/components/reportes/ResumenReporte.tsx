import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ColumnaReporte, FilaReporte, formatearValor } from '../../models/reportes';
import { colores, espaciado, radios, tipografia } from '../../theme';

interface Props {
  columnas: ColumnaReporte[];
  filas: FilaReporte[];
}

/**
 * Las cifras solas, en grande. Es la forma de un reporte que responde "cuantos" en vez
 * de listar filas. Con varias filas se muestra una tarjeta por fila.
 */
export function ResumenReporte({ columnas, filas }: Props) {
  return (
    <View style={styles.grilla}>
      {filas.map((fila, indice) =>
        columnas.map((columna) => (
          <View key={`${indice}-${columna.clave}`} style={styles.tarjeta}>
            <Text style={styles.cifra}>{formatearValor(fila[columna.clave], columna.tipo)}</Text>
            <Text style={styles.etiqueta}>{columna.etiqueta}</Text>
          </View>
        )),
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  grilla: { flexDirection: 'row', flexWrap: 'wrap', gap: espaciado.m },
  tarjeta: {
    minWidth: 150,
    flexGrow: 1,
    backgroundColor: colores.papel,
    borderWidth: 1,
    borderColor: colores.linea,
    borderRadius: radios.m,
    padding: espaciado.m,
  },
  cifra: {
    fontFamily: tipografia.familias.titulo,
    fontSize: tipografia.escala.numeral,
    color: colores.accion,
  },
  etiqueta: {
    fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.escala.nota,
    color: colores.tintaSuave,
    marginTop: espaciado.xs,
  },
});
