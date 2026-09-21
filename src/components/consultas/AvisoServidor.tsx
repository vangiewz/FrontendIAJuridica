import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Icono } from '../shared/Icono';
import { colores, espaciado, radios, tipografia } from '../../theme';
import { useBarraConexion } from '../../controllers/conexion/useBarraConexion';

/** Aparece solo cuando no se llega al backend, con lo que hay que revisar. */
export function AvisoServidor({ comprobando, onReintentar }: {
  comprobando: boolean; onReintentar: () => void;
}) {
  const { estado } = useBarraConexion();
  if (estado.tipo !== 'oculta') return null;

  return (
    <View style={styles.raiz} accessibilityRole="alert">
      <Icono nombre="cloud-offline-outline" tamano={20} color={colores.alerta} />
      <View style={styles.texto}>
        <Text style={styles.titulo}>Sin conexión con el servidor</Text>
        <Text style={styles.detalle}>
          Verifica tu conexión a internet o intenta de nuevo más tarde.
        </Text>
      </View>
      <Pressable onPress={onReintentar} disabled={comprobando} style={styles.boton}
        accessibilityRole="button" accessibilityLabel="Volver a comprobar la conexión">
        {comprobando ? <ActivityIndicator size="small" color={colores.accion} />
          : <Icono nombre="refresh" tamano={20} color={colores.accion} />}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  raiz: { flexDirection: 'row', alignItems: 'center', gap: espaciado.s, marginTop: espaciado.s,
    padding: espaciado.s, backgroundColor: colores.linea, borderRadius: radios.m },
  texto: { flex: 1 },
  titulo: { color: colores.tinta, fontFamily: tipografia.familias.cuerpoFuerte,
    fontSize: tipografia.escala.nota },
  detalle: { color: colores.tintaSuave, fontFamily: tipografia.familias.cuerpo, fontSize: 12,
    marginTop: 2, lineHeight: 16 },
  boton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});
