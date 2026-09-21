import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Icono, NombreIcono } from '../shared/Icono';
import { colores, espaciado, radios, tipografia } from '../../theme';

export interface FichaContexto {
  clave: string;
  icono: NombreIcono;
  texto: string;
  accesible: string;
  alPulsar: () => void;
  /** Cerrar lo activo (solo el documento se puede cerrar desde aquí). */
  alQuitar?: () => void;
}

/**
 * Qué está activo en la llamada, en pocas fichas discretas: el documento, la comparación,
 * el reporte, el documento generado. Tocar una la abre en el panel. No muestra nada si no
 * hay nada activo, para no saturar la pantalla.
 */
export function ContextoLlamada({ fichas }: { fichas: FichaContexto[] }) {
  if (fichas.length === 0) return null;
  return (
    <View style={styles.fila}>
      {fichas.map((f) => (
        <View key={f.clave} style={styles.ficha}>
          <Pressable onPress={f.alPulsar} accessibilityRole="button" accessibilityLabel={f.accesible}
            style={({ pressed }) => [styles.principal, pressed && styles.presionado]}>
            <Icono nombre={f.icono} tamano={16} color={colores.accion} />
            <Text style={styles.texto} numberOfLines={1}>{f.texto}</Text>
          </Pressable>
          {f.alQuitar ? (
            <Pressable onPress={f.alQuitar} accessibilityRole="button" hitSlop={8}
              accessibilityLabel={`Cerrar ${f.texto}`} style={styles.quitar}>
              <Icono nombre="close" tamano={14} color={colores.tintaSuave} />
            </Pressable>
          ) : null}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  fila: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: espaciado.xs, paddingHorizontal: espaciado.s },
  ficha: {
    flexDirection: 'row', alignItems: 'center', maxWidth: '100%', borderRadius: radios.round, borderWidth: 1,
    borderColor: colores.linea, backgroundColor: colores.superficie,
  },
  principal: { flexShrink: 1, flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 36, paddingHorizontal: espaciado.s },
  texto: { flexShrink: 1, maxWidth: 190, fontFamily: tipografia.familias.cuerpoFuerte, fontSize: 13, color: colores.tinta },
  quitar: { width: 32, height: 36, alignItems: 'center', justifyContent: 'center' },
  presionado: { opacity: 0.6 },
});
