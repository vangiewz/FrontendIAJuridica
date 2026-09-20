import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { colores, espaciado, radios, tipografia } from '../../../theme';

interface Props {
  problemas: string[];
  sugerencias: string[];
  cargando: boolean;
  hayConfiguracion: boolean;
  onGenerar: () => void;
  onLimpiar: () => void;
}

/**
 * El cierre del constructor: generar, y en segundo plano volver a empezar.
 *
 * Generar es lo unico grande y verde de esta zona. "Empezar de nuevo" es un enlace
 * discreto y pide confirmacion si hay algo armado, porque borrar el trabajo de alguien
 * por un toque accidental es el peor final posible.
 */
export function AccionesConstructor({
  problemas, sugerencias, cargando, hayConfiguracion, onGenerar, onLimpiar,
}: Props) {
  const [confirmando, setConfirmando] = useState(false);
  const bloqueado = problemas.length > 0 || cargando;

  return (
    <View>
      {sugerencias.map((sugerencia) => (
        <Text key={sugerencia} style={styles.sugerencia}>
          {sugerencia}
        </Text>
      ))}
      {problemas.map((problema) => (
        <Text key={problema} style={styles.problema}>
          {problema}
        </Text>
      ))}

      <Pressable
        onPress={onGenerar}
        disabled={bloqueado}
        style={[styles.generar, bloqueado && styles.generarBloqueado]}
        accessibilityRole="button"
        accessibilityState={{ disabled: bloqueado }}
        accessibilityLabel="Generar reporte"
      >
        {cargando ? (
          <ActivityIndicator color={colores.accionTexto} />
        ) : (
          <Text style={styles.generarTexto}>GENERAR REPORTE</Text>
        )}
      </Pressable>

      {confirmando ? (
        <View style={styles.confirmar}>
          <Text style={styles.confirmarTexto}>
            ¿Querés borrar la configuración actual y empezar de nuevo?
          </Text>
          <View style={styles.confirmarBotones}>
            <Pressable
              onPress={() => setConfirmando(false)}
              style={styles.secundario}
              accessibilityRole="button"
            >
              <Text style={styles.secundarioTexto}>No, seguir acá</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                onLimpiar();
                setConfirmando(false);
              }}
              style={styles.secundario}
              accessibilityRole="button"
            >
              <Text style={styles.borrarTexto}>Sí, borrar todo</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <Pressable
          onPress={() => (hayConfiguracion ? setConfirmando(true) : onLimpiar())}
          style={styles.enlace}
          accessibilityRole="button"
        >
          <Text style={styles.enlaceTexto}>Empezar de nuevo</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  sugerencia: {
    fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.escala.nota,
    color: colores.tintaSuave,
    lineHeight: 20,
    marginBottom: espaciado.xs,
  },
  problema: {
    fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.escala.nota,
    color: colores.alerta,
    lineHeight: 20,
    marginBottom: espaciado.xs,
  },
  generar: {
    minHeight: 56,
    borderRadius: radios.m,
    backgroundColor: colores.accion,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: espaciado.m,
  },
  generarBloqueado: { backgroundColor: colores.linea },
  generarTexto: {
    fontFamily: tipografia.familias.cuerpoFuerte,
    fontSize: tipografia.escala.subtitulo,
    color: colores.accionTexto,
    letterSpacing: 0.5,
  },
  enlace: {
    alignSelf: 'center',
    minHeight: 44,
    justifyContent: 'center',
    marginTop: espaciado.s,
  },
  enlaceTexto: {
    fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.escala.nota,
    color: colores.tintaSuave,
    textDecorationLine: 'underline',
  },
  confirmar: {
    borderWidth: 1,
    borderColor: colores.destacado,
    borderRadius: radios.m,
    padding: espaciado.m,
    marginTop: espaciado.m,
    backgroundColor: colores.papel,
  },
  confirmarTexto: {
    fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.escala.cuerpo,
    color: colores.tinta,
    marginBottom: espaciado.s,
  },
  confirmarBotones: { flexDirection: 'row', gap: espaciado.s, flexWrap: 'wrap' },
  secundario: {
    minHeight: 44,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colores.linea,
    borderRadius: radios.m,
    paddingHorizontal: espaciado.m,
    backgroundColor: colores.superficie,
  },
  secundarioTexto: {
    fontFamily: tipografia.familias.cuerpoFuerte,
    fontSize: tipografia.escala.nota,
    color: colores.tinta,
  },
  borrarTexto: {
    fontFamily: tipografia.familias.cuerpoFuerte,
    fontSize: tipografia.escala.nota,
    color: colores.alerta,
  },
});
