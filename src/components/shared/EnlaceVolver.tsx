import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { Href } from 'expo-router';
import { useVolver } from '../../controllers/navegacion/useVolver';
import { colores, espaciado, tipografia } from '../../theme';

interface Props {
  /** Destino solo para cuando no hay pantalla anterior (enlace compartido o F5). */
  respaldo: Href;
  etiqueta?: string;
}

/**
 * Atras visible dentro de la propia pantalla.
 *
 * El encabezado del Stack ya dibuja una flecha, pero no cuando se entra directo por
 * URL: ahi la pila arranca en esta pantalla y no hay nada que dibujar. Sin esto, quien
 * abre un enlace compartido se queda sin salida.
 */
export function EnlaceVolver({ respaldo, etiqueta = 'Volver' }: Props) {
  const volver = useVolver(respaldo);
  return (
    <Pressable onPress={volver} accessibilityRole="button" style={styles.enlace}>
      <Text style={styles.texto}>‹ {etiqueta}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  enlace: {
    alignSelf: 'flex-start',
    paddingVertical: espaciado.s,
    paddingRight: espaciado.m,
    marginBottom: espaciado.s,
  },
  texto: {
    fontFamily: tipografia.familias.cuerpoFuerte,
    fontSize: tipografia.escala.nota,
    color: colores.accion,
  },
});
