import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colores, espaciado, radios, tipografia } from '../../theme';

interface Props<T extends string> {
  pestanas: { clave: T; etiqueta: string }[];
  activa: T;
  onCambiar: (clave: T) => void;
}

/**
 * Pestañas del panel. Cambiar de pestaña es solo estado local de lo que se ve: no toca la
 * voz ni el panel de fondo. Con una sola pestaña no se dibuja nada (no hay a dónde ir).
 */
export function Pestanas<T extends string>({ pestanas, activa, onCambiar }: Props<T>) {
  if (pestanas.length < 2) return null;
  return (
    <View style={styles.fila} accessibilityRole="tablist">
      {pestanas.map(({ clave, etiqueta }) => {
        const seleccionada = clave === activa;
        return (
          <Pressable key={clave} onPress={() => onCambiar(clave)} accessibilityRole="tab"
            accessibilityState={{ selected: seleccionada }}
            style={[styles.pestana, seleccionada && styles.pestanaActiva]}>
            <Text style={[styles.texto, seleccionada && styles.textoActivo]}>{etiqueta}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  fila: { flexDirection: 'row', gap: espaciado.s, paddingHorizontal: espaciado.m, paddingVertical: espaciado.s },
  pestana: {
    minHeight: 40, paddingHorizontal: espaciado.m, justifyContent: 'center',
    borderRadius: radios.round, borderWidth: 1, borderColor: colores.linea, backgroundColor: colores.papel,
  },
  pestanaActiva: { backgroundColor: colores.accion, borderColor: colores.accion },
  texto: { fontFamily: tipografia.familias.cuerpoFuerte, fontSize: tipografia.escala.nota, color: colores.tinta },
  textoActivo: { color: colores.accionTexto },
});
