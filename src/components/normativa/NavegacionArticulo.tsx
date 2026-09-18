import React from 'react';
import { View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Boton } from '../shared/Boton';
import { espaciado } from '../../theme';

interface Props {
  codigo: string;
  anterior: number | null;
  siguiente: number | null;
}

export function NavegacionArticulo({ codigo, anterior, siguiente }: Props) {
  if (anterior === null && siguiente === null) return null;

  return (
    <View style={styles.contenedor}>
      <View style={styles.botonWrapper}>
        {anterior !== null && (
          <Boton
            variante="secundario"
            titulo={`‹ Artículo ${anterior}`}
            onPress={() => {
              router.replace(`/articulo?codigo=${encodeURIComponent(codigo)}&numero=${anterior}`);
            }}
          />
        )}
      </View>
      <View style={styles.espaciador} />
      <View style={styles.botonWrapper}>
        {siguiente !== null && (
          <Boton
            variante="secundario"
            titulo={`Artículo ${siguiente} ›`}
            onPress={() => {
              router.replace(`/articulo?codigo=${encodeURIComponent(codigo)}&numero=${siguiente}`);
            }}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: espaciado.xl,
  },
  botonWrapper: {
    flex: 1,
  },
  espaciador: {
    width: espaciado.m,
  },
});
