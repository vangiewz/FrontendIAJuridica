import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Icono } from '../shared/Icono';
import { colores, espaciado, radios, tipografia } from '../../theme';

interface Props {
  mensaje: string;
  puedeReintentar: boolean;
  alReintentar: () => void;
  alCerrar: () => void;
}

/** Una operación falló: se dice qué pasó y se ofrece reintentar. La llamada sigue activa. */
export function ContenidoError({ mensaje, puedeReintentar, alReintentar, alCerrar }: Props) {
  return (
    <View style={styles.raiz}>
      <Text style={styles.mensaje} accessibilityLiveRegion="polite">{mensaje}</Text>
      <View style={styles.acciones}>
        {puedeReintentar ? (
          <Pressable onPress={alReintentar} accessibilityRole="button" style={styles.reintentar}>
            <Icono nombre="refresh" tamano={18} color={colores.accionTexto} />
            <Text style={styles.reintentarTexto}>Reintentar</Text>
          </Pressable>
        ) : null}
        <Pressable onPress={alCerrar} accessibilityRole="button" style={styles.cerrar}>
          <Text style={styles.cerrarTexto}>Cerrar</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  raiz: { padding: espaciado.m, gap: espaciado.m },
  mensaje: { fontFamily: tipografia.familias.cuerpo, fontSize: tipografia.escala.cuerpo, color: colores.alerta, lineHeight: 24 },
  acciones: { flexDirection: 'row', alignItems: 'center', gap: espaciado.m },
  reintentar: {
    flexDirection: 'row', alignItems: 'center', gap: espaciado.s, minHeight: 48, paddingHorizontal: espaciado.l,
    borderRadius: radios.m, backgroundColor: colores.accion,
  },
  reintentarTexto: { fontFamily: tipografia.familias.cuerpoFuerte, fontSize: tipografia.escala.cuerpo, color: colores.accionTexto },
  cerrar: { minHeight: 48, justifyContent: 'center', paddingHorizontal: espaciado.s },
  cerrarTexto: { fontFamily: tipografia.familias.cuerpoFuerte, fontSize: tipografia.escala.cuerpo, color: colores.tintaSuave },
});
