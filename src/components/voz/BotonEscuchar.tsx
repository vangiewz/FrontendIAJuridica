import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Icono } from '../shared/Icono';
import { useLectura } from '../../controllers/voz/useLectura';
import { LECTURA_DISPONIBLE } from '../../services/voz/lectura';
import { colores, espaciado, radios, tipografia } from '../../theme';

/**
 * «Escuchar respuesta» / «Detener». La lectura la inicia siempre el usuario y usa la voz
 * del propio teléfono. Una vez terminada, el mismo botón permite volver a reproducirla.
 */
export function BotonEscuchar({ id, texto }: { id: string; texto: string }) {
  const { leyendo, error, alternar } = useLectura(id, texto);
  if (!LECTURA_DISPONIBLE || !texto.trim()) return null;
  return (
    <View style={styles.raiz}>
      <Pressable onPress={alternar} accessibilityRole="button"
        accessibilityLabel={leyendo ? 'Detener la lectura de la respuesta' : 'Escuchar la respuesta'}
        style={({ pressed }) => [styles.boton, leyendo && styles.botonActivo, pressed && styles.presionado]}>
        <Icono nombre={leyendo ? 'stop-circle-outline' : 'volume-high-outline'} tamano={20}
          color={leyendo ? colores.accionTexto : colores.accion} />
        <Text style={[styles.texto, leyendo && styles.textoActivo]}>
          {leyendo ? 'Detener' : 'Escuchar respuesta'}
        </Text>
      </Pressable>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  raiz: { marginTop: espaciado.m, alignItems: 'flex-start' },
  boton: { flexDirection: 'row', alignItems: 'center', gap: espaciado.xs, minHeight: 44,
    paddingHorizontal: espaciado.m, borderRadius: radios.round, borderWidth: 1,
    borderColor: colores.accion, backgroundColor: colores.superficie },
  botonActivo: { backgroundColor: colores.accion },
  presionado: { opacity: 0.75 },
  texto: { color: colores.accion, fontFamily: tipografia.familias.cuerpoFuerte,
    fontSize: tipografia.escala.nota },
  textoActivo: { color: colores.accionTexto },
  error: { color: colores.alerta, fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.escala.nota, marginTop: espaciado.xs },
});
