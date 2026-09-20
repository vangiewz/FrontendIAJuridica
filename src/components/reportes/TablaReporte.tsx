import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ColumnaReporte, FilaReporte, CLAVE_ID, formatearValor } from '../../models/reportes';
import { colores, espaciado, radios, tipografia } from '../../theme';

interface Props {
  columnas: ColumnaReporte[];
  filas: FilaReporte[];
  /** Solo se pasa cuando cada fila corresponde a algo que tiene pantalla propia. */
  onAbrir?: (id: string) => void;
}

const ANCHO_COLUMNA = 170;

export function TablaReporte({ columnas, filas, onAbrir }: Props) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator>
      <View>
        <View style={[styles.fila, styles.cabecera]}>
          {columnas.map((columna) => (
            <Text key={columna.clave} style={[styles.celda, styles.celdaCabecera]} numberOfLines={2}>
              {columna.etiqueta}
            </Text>
          ))}
        </View>

        {filas.map((fila, indice) => {
          const id = fila[CLAVE_ID];
          const abrible = Boolean(onAbrir && typeof id === 'string' && id);
          const contenido = columnas.map((columna) => (
            <Text key={columna.clave} style={styles.celda} numberOfLines={3}>
              {formatearValor(fila[columna.clave], columna.tipo)}
            </Text>
          ));

          if (!abrible) {
            return (
              <View key={indice} style={[styles.fila, indice % 2 === 1 && styles.filaAlterna]}>
                {contenido}
              </View>
            );
          }
          return (
            <Pressable
              key={indice}
              onPress={() => onAbrir!(String(id))}
              style={({ pressed }) => [
                styles.fila,
                indice % 2 === 1 && styles.filaAlterna,
                pressed && styles.filaPresionada,
              ]}
            >
              {contenido}
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  fila: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colores.linea },
  filaAlterna: { backgroundColor: colores.papel },
  filaPresionada: { backgroundColor: colores.linea },
  cabecera: {
    backgroundColor: colores.superficie,
    borderTopLeftRadius: radios.s,
    borderTopRightRadius: radios.s,
    borderBottomWidth: 2,
  },
  celda: {
    width: ANCHO_COLUMNA,
    paddingVertical: espaciado.s,
    paddingHorizontal: espaciado.s,
    fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.escala.nota,
    color: colores.tinta,
  },
  celdaCabecera: {
    fontFamily: tipografia.familias.cuerpoFuerte,
    color: colores.tintaSuave,
  },
});
