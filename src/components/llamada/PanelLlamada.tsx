import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo, Animated, Easing, PanResponder, Pressable, StyleSheet, Text, View,
} from 'react-native';
import { Icono } from '../shared/Icono';
import { TamanoPanel } from '../../models/llamada';
import { colores, espaciado, radios, tipografia } from '../../theme';

/** Alto de la barra cuando el panel está minimizado: solo el encabezado. */
export const ALTO_BARRA = 56;
const DURACION_MS = 220;

interface Props {
  abierto: boolean;
  tamano: TamanoPanel;
  titulo: string;
  /** Más de un nivel: el «atrás» del panel se muestra y vuelve un nivel, sin cerrar nada. */
  hayNivelAtras: boolean;
  alturaMedio: number;
  alturaExpandido: number;
  alVolver: () => void;
  alCerrar: () => void;
  alMinimizar: () => void;
  alRestaurar: () => void;
  alAlternarExpansion: () => void;
  /** El asa se arrastra o se toca: sube o baja un escalón. */
  alSubir: () => void;
  alBajar: () => void;
  children: React.ReactNode;
}

const altoObjetivo = (tamano: TamanoPanel, medio: number, expandido: number) =>
  tamano === 'minimizado' ? ALTO_BARRA : tamano === 'medio' ? medio : expandido;

/**
 * Panel deslizable de la llamada: una hoja que vive DENTRO de la pantalla de llamada, entre
 * el avatar y los botones. Es solo presentación:
 *
 *  - no importa ni llama a la voz, al micrófono ni al sondeo: abrirlo, cerrarlo,
 *    minimizarlo, expandirlo o desplazarse por su contenido no puede cortar al asistente;
 *  - no desmonta nada de arriba: `LlamadaActiva` (y con ella `useLlamada`) sigue montada;
 *  - el avatar sigue a la vista (la pantalla le da un tamaño según el del panel).
 *
 * Se anima con `Animated` de React Native (sin librerías): el alto pasa suavemente entre
 * barra, media pantalla y casi pantalla completa; al cerrarse se pliega y se desmonta.
 */
export function PanelLlamada({
  abierto, tamano, titulo, hayNivelAtras, alturaMedio, alturaExpandido,
  alVolver, alCerrar, alMinimizar, alRestaurar, alAlternarExpansion, alSubir, alBajar, children,
}: Props) {
  const alto = useRef(new Animated.Value(0)).current;
  const [montado, setMontado] = useState(abierto);
  const [sinAnimacion, setSinAnimacion] = useState(false);

  useEffect(() => {
    let vigente = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((v) => { if (vigente) setSinAnimacion(v); }).catch(() => undefined);
    return () => { vigente = false; };
  }, []);

  useEffect(() => {
    const destino = abierto ? altoObjetivo(tamano, alturaMedio, alturaExpandido) : 0;
    if (abierto) setMontado(true);
    Animated.timing(alto, {
      toValue: destino, duration: sinAnimacion ? 0 : DURACION_MS, easing: Easing.out(Easing.cubic),
      useNativeDriver: false, // el alto es una propiedad de layout: no admite el hilo nativo
    }).start(({ finished }) => { if (finished && !abierto) setMontado(false); });
  }, [abierto, tamano, alturaMedio, alturaExpandido, alto, sinAnimacion]);

  // El asa acepta arrastre vertical; los botones del encabezado siguen recibiendo sus toques.
  const asa = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dy) > 10 && Math.abs(g.dy) > Math.abs(g.dx),
    onPanResponderRelease: (_e, g) => {
      if (g.dy < -30) alSubir();
      else if (g.dy > 30) alBajar();
    },
  }), [alSubir, alBajar]);

  if (!montado) return null;
  const minimizado = tamano === 'minimizado';

  return (
    <Animated.View style={[styles.hoja, { height: alto }]} accessibilityViewIsModal={false}>
      <View {...asa.panHandlers}>
        <Pressable onPress={minimizado ? alRestaurar : alAlternarExpansion} accessibilityRole="button"
          accessibilityLabel={minimizado ? 'Abrir el panel' : 'Cambiar el tamaño del panel'} style={styles.asaZona}>
          <View style={styles.asa} />
        </Pressable>
        <View style={styles.encabezado}>
          {hayNivelAtras ? (
            <Icono1 nombre="chevron-back" etiqueta="Volver dentro del panel" onPress={alVolver} />
          ) : null}
          <Text style={styles.titulo} numberOfLines={1} accessibilityRole="header">{titulo}</Text>
          {minimizado ? (
            <Icono1 nombre="chevron-up" etiqueta="Mostrar el panel" onPress={alRestaurar} />
          ) : (
            <>
              <Icono1 nombre={tamano === 'expandido' ? 'contract-outline' : 'expand-outline'}
                etiqueta={tamano === 'expandido' ? 'Reducir el panel' : 'Ampliar el panel'} onPress={alAlternarExpansion} />
              <Icono1 nombre="chevron-down" etiqueta="Minimizar el panel" onPress={alMinimizar} />
            </>
          )}
          {/* Cierra SOLO el panel: la llamada sigue activa. Finalizarla es el botón rojo de abajo. */}
          <Icono1 nombre="close" etiqueta="Cerrar el panel (la llamada sigue)" onPress={alCerrar} />
        </View>
      </View>
      {minimizado ? null : <View style={styles.contenido}>{children}</View>}
    </Animated.View>
  );
}

function Icono1({ nombre, etiqueta, onPress }: {
  nombre: React.ComponentProps<typeof Icono>['nombre']; etiqueta: string; onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={etiqueta} hitSlop={6}
      style={({ pressed }) => [styles.icono, pressed && styles.presionado]}>
      <Icono nombre={nombre} tamano={22} color={colores.tinta} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hoja: {
    width: '100%', overflow: 'hidden', backgroundColor: colores.superficie,
    borderTopLeftRadius: radios.xl, borderTopRightRadius: radios.xl,
    borderWidth: 1, borderBottomWidth: 0, borderColor: colores.linea,
  },
  asaZona: { alignItems: 'center', paddingTop: 8, paddingBottom: 4 },
  asa: { width: 40, height: 4, borderRadius: 2, backgroundColor: colores.linea },
  encabezado: {
    flexDirection: 'row', alignItems: 'center', gap: espaciado.xs,
    paddingHorizontal: espaciado.m, minHeight: 36, paddingBottom: 4,
  },
  titulo: {
    flex: 1, fontFamily: tipografia.familias.cuerpoFuerte, fontSize: tipografia.escala.cuerpo, color: colores.tinta,
  },
  icono: { width: 40, height: 36, alignItems: 'center', justifyContent: 'center' },
  presionado: { opacity: 0.6 },
  contenido: { flex: 1, borderTopWidth: 1, borderTopColor: colores.linea },
});
