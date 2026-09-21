import React, { useEffect, useId } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import Animated, {
  cancelAnimation, Easing, Extrapolation, interpolate, useAnimatedStyle, useReducedMotion,
  useSharedValue, withDelay, withRepeat, withSequence, withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import { colores } from '../../theme';
import { EstadoAvatar, ETIQUETA_AVATAR } from './estados';

/**
 * Avatar 2D del asistente jurídico: un sello digital —disco verde con un aro dorado— con
 * una cara mínima (dos ojos y una boca). Todo es vector (react-native-svg) y no usa
 * imágenes ni red. El movimiento corre en el hilo de interfaz (Reanimated) y respeta
 * «reducir movimiento» del sistema: entonces cada estado se muestra como una pose fija.
 *
 * Estados: idle (respira y parpadea), listening (aura y ojos atentos), transcribing (arco
 * giratorio y ojos entornados), thinking (ojos que buscan y tres puntos; sin porcentajes),
 * speaking (la boca se mueve) y error (gris, aro rojo y ojos bajos; discreto).
 *
 * Las coordenadas están en un espacio de 100 × 100; el disco ocupa el 76 % de la caja para
 * que el aura y el arco crezcan dentro de ella sin desbordar ni tapar nada.
 */

const VERDE_CLARO = '#2F8F66';   // aclarado de colores.accion: da volumen al disco
const VERDE_PANTALLA = '#0E4632'; // oscurecido de colores.accion: la «pantalla» donde vive la cara
const GRIS_PANTALLA = '#47423C';  // la misma pantalla en el estado de error
const VISOR = { x: 23, y: 32, w: 54, h: 44 };
const OJO = { w: 7.5, h: 15, cy: 44, izquierdo: 37.5, derecho: 62.5 };
const BOCA = { w: 17, h: 9, cy: 63 };
const DISCO = 38;                // radio del disco
const HABLA = [0.85, 0.25, 0.6, 0.15, 1, 0.35, 0.7, 0.2]; // aperturas de la boca al hablar

const OJOS_ESCALA_Y: Record<EstadoAvatar, number> =
  { idle: 1, listening: 1.18, transcribing: 0.55, thinking: 0.9, speaking: 1, error: 0.45 };
const OJOS_DESPLAZAMIENTO_Y: Record<EstadoAvatar, number> =
  { idle: 0, listening: -0.5, transcribing: 0, thinking: -0.8, speaking: 0, error: 1.2 };

interface Props {
  estado: EstadoAvatar;
  /** Lado de la caja en dp. Por defecto 88; en el encabezado se usa ~48. */
  tamano?: number;
  /** Descripción para lectores de pantalla; por defecto la del estado. */
  etiqueta?: string;
  style?: StyleProp<ViewStyle>;
}

export function AvatarAsistente({ estado, tamano = 88, etiqueta, style }: Props) {
  const u = tamano / 100;
  const reducir = useReducedMotion();
  const a = useAnimacion(estado, reducir);
  const gradiente = `g${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const caja = { width: tamano, height: tamano };
  const disco = DISCO * 2 * u;
  const margen = (tamano - disco) / 2;

  return (
    <View accessible accessibilityRole="image" accessibilityLabel={etiqueta ?? ETIQUETA_AVATAR[estado]}
      style={[caja, style]}>
      {/* Aura: dos ondas que salen del disco mientras escucha */}
      {[a.aura1, a.aura2].map((onda, i) => (
        <Animated.View key={i} style={[styles.capa, {
          left: margen, top: margen, width: disco, height: disco, borderRadius: disco / 2,
          borderWidth: Math.max(1.5, 2 * u), borderColor: colores.accion }, onda]} />
      ))}

      {/* Arco dorado que gira mientras transcribe */}
      <Animated.View style={[styles.capa, caja, a.giro]}>
        <Svg width={tamano} height={tamano} viewBox="0 0 100 100">
          <Circle cx={50} cy={50} r={45.5} fill="none" stroke={colores.destacado} strokeWidth={2.6}
            strokeLinecap="round" strokeDasharray="62 224" />
        </Svg>
      </Animated.View>

      {/* Cuerpo: respira y cambia de escala según el estado; lleva la cara dentro */}
      <Animated.View style={[styles.capa, caja, a.cuerpo]}>
        <Svg width={tamano} height={tamano} viewBox="0 0 100 100">
          <Defs>
            <RadialGradient id={gradiente} cx="38%" cy="30%" r="85%">
              <Stop offset="0" stopColor={VERDE_CLARO} />
              <Stop offset="1" stopColor={colores.accion} />
            </RadialGradient>
          </Defs>
          <Circle cx={50} cy={50} r={DISCO} fill={`url(#${gradiente})`} />
          <Rect x={VISOR.x} y={VISOR.y} width={VISOR.w} height={VISOR.h} rx={VISOR.h / 2}
            fill={VERDE_PANTALLA} opacity={0.55} />
          <Circle cx={50} cy={50} r={DISCO + 3.4} fill="none" stroke={colores.destacado}
            strokeWidth={1.4} opacity={0.9} />
        </Svg>

        {/* Error: el disco pasa a gris y el aro a rojo, sin dramatismo */}
        <Animated.View style={[styles.capa, caja, a.error]}>
          <Svg width={tamano} height={tamano} viewBox="0 0 100 100">
            <Circle cx={50} cy={50} r={DISCO} fill={colores.tintaSuave} />
            <Rect x={VISOR.x} y={VISOR.y} width={VISOR.w} height={VISOR.h} rx={VISOR.h / 2}
              fill={GRIS_PANTALLA} opacity={0.6} />
            <Circle cx={50} cy={50} r={DISCO + 3.4} fill="none" stroke={colores.alerta} strokeWidth={1.8} />
          </Svg>
        </Animated.View>

        {/* Ojos */}
        {[OJO.izquierdo, OJO.derecho].map((cx) => (
          <Animated.View key={cx} style={[styles.capa, {
            left: (cx - OJO.w / 2) * u, top: (OJO.cy - OJO.h / 2) * u,
            width: OJO.w * u, height: OJO.h * u, borderRadius: (OJO.w * u) / 2,
            backgroundColor: colores.papel }, a.ojos]} />
        ))}

        {/* Boca: una píldora que se abre al hablar */}
        <Animated.View style={[styles.capa, {
          left: (50 - BOCA.w / 2) * u, top: (BOCA.cy - BOCA.h / 2) * u,
          width: BOCA.w * u, height: BOCA.h * u, borderRadius: (BOCA.h * u) / 2,
          backgroundColor: colores.papel }, a.boca]} />

        {/* Tres puntos en lugar de la boca mientras analiza: actividad, no progreso */}
        {[a.punto0, a.punto1, a.punto2].map((estilo, i) => (
          <Animated.View key={i} style={[styles.capa, {
            left: (50 + (i - 1) * 7.5 - 2.1) * u, top: (BOCA.cy - 2.1) * u,
            width: 4.2 * u, height: 4.2 * u, borderRadius: 2.1 * u,
            backgroundColor: colores.papel }, estilo]} />
        ))}

        {/* Boca de error: una línea levemente caída */}
        <Animated.View style={[styles.capa, caja, a.error]}>
          <Svg width={tamano} height={tamano} viewBox="0 0 100 100">
            <Path d="M 42 66.5 Q 50 63.8 58 66.5" fill="none" stroke={colores.papel} strokeWidth={2.4}
              strokeLinecap="round" />
          </Svg>
        </Animated.View>
      </Animated.View>

      {/* Insignia de error: visible incluso en tamaño pequeño */}
      <Animated.View style={[styles.capa, caja, a.error]}>
        <Svg width={tamano} height={tamano} viewBox="0 0 100 100">
          <Circle cx={84} cy={16} r={12} fill={colores.alerta} stroke={colores.superficie} strokeWidth={2} />
          <Rect x={82.6} y={9.5} width={2.8} height={8} rx={1.4} fill={colores.papel} />
          <Circle cx={84} cy={21.6} r={1.7} fill={colores.papel} />
        </Svg>
      </Animated.View>
    </View>
  );
}

/**
 * Todas las animaciones del avatar. Cada valor compartido vive en el hilo de UI; los
 * efectos solo cambian su destino cuando cambia el estado. Con «reducir movimiento» no
 * hay bucles: se aplica la pose del estado y nada se mueve.
 */
function useAnimacion(estado: EstadoAvatar, reducir: boolean) {
  const respira = useSharedValue(1);
  const cuerpo = useSharedValue(1);
  const ojoY = useSharedValue(1);
  const ojoX = useSharedValue(1);
  const ojoDx = useSharedValue(0);
  const ojoDy = useSharedValue(0);
  const parpadeo = useSharedValue(1);
  const boca = useSharedValue(0);
  const puntos = useSharedValue(0);
  const fase = useSharedValue(0);
  const aura1Valor = useSharedValue(0);
  const aura2Valor = useSharedValue(0);
  const auraActiva = useSharedValue(0);
  const giroValor = useSharedValue(0);
  const giroActivo = useSharedValue(0);
  const error = useSharedValue(0);

  useEffect(() => {
    const ir = (destino: number, ms = 280) =>
      withTiming(destino, { duration: reducir ? 0 : ms, easing: Easing.out(Easing.cubic) });
    const escuchando = estado === 'listening';
    const transcribiendo = estado === 'transcribing';
    const pensando = estado === 'thinking';
    const hablando = estado === 'speaking';

    cuerpo.value = ir(escuchando ? 1.04 : estado === 'error' ? 0.97 : 1);
    ojoY.value = ir(OJOS_ESCALA_Y[estado]);
    ojoX.value = ir(escuchando ? 1.1 : 1);
    ojoDy.value = ir(OJOS_DESPLAZAMIENTO_Y[estado]);
    error.value = ir(estado === 'error' ? 1 : 0, 400);
    puntos.value = ir(pensando ? 1 : 0);
    auraActiva.value = ir(escuchando ? 1 : 0, 300);
    giroActivo.value = ir(transcribiendo ? 1 : 0, 300);

    if (reducir) {
      // Pose fija por estado, sin movimiento continuo.
      respira.value = 1;
      ojoDx.value = 0;
      boca.value = hablando ? 0.55 : 0;
      fase.value = 0.5;
      aura1Valor.value = 0.3;
      aura2Valor.value = 0.3;
      cancelAnimation(giroValor);
      return;
    }

    respira.value = estado === 'error' ? ir(1) : withRepeat(withSequence(
      withTiming(1.03, { duration: 2300, easing: Easing.inOut(Easing.sin) }),
      withTiming(1, { duration: 2300, easing: Easing.inOut(Easing.sin) })), -1, false);

    ojoDx.value = pensando
      ? withSequence(withTiming(-1, { duration: 350 }),
        withRepeat(withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.sin) }), -1, true))
      : ir(0);

    boca.value = hablando
      ? withRepeat(withSequence(...HABLA.map((abierta, i) =>
        withTiming(abierta, { duration: 90 + ((i * 37) % 70), easing: Easing.inOut(Easing.quad) }))), -1, false)
      : ir(0, 160);

    if (pensando) {
      fase.value = 0;
      fase.value = withRepeat(withTiming(3, { duration: 1300, easing: Easing.linear }), -1, false);
    } else {
      cancelAnimation(fase);
    }

    if (escuchando) {
      aura1Valor.value = 0;
      aura2Valor.value = 0;
      const onda = () => withRepeat(withTiming(1, { duration: 1700, easing: Easing.out(Easing.quad) }), -1, false);
      aura1Valor.value = onda();
      aura2Valor.value = withDelay(850, onda());
    } else {
      cancelAnimation(aura1Valor);
      cancelAnimation(aura2Valor);
    }

    if (transcribiendo) {
      giroValor.value = 0;
      giroValor.value = withRepeat(withTiming(360, { duration: 1300, easing: Easing.linear }), -1, false);
    } else {
      cancelAnimation(giroValor);
    }
  }, [estado, reducir]); // eslint-disable-line react-hooks/exhaustive-deps

  // Parpadeo ocasional, a intervalos irregulares. No parpadea con los ojos ya entornados.
  useEffect(() => {
    if (reducir || estado === 'error' || estado === 'transcribing') return undefined;
    let temporizador: ReturnType<typeof setTimeout>;
    const programar = () => {
      temporizador = setTimeout(() => {
        parpadeo.value = withSequence(withTiming(0.08, { duration: 80 }), withTiming(1, { duration: 140 }));
        programar();
      }, 2600 + Math.random() * 3400);
    };
    programar();
    return () => { clearTimeout(temporizador); parpadeo.value = 1; };
  }, [estado, reducir]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => {
    [respira, cuerpo, ojoY, ojoX, ojoDx, ojoDy, parpadeo, boca, puntos, fase, aura1Valor,
      aura2Valor, auraActiva, giroValor, giroActivo, error].forEach((v) => cancelAnimation(v));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const estiloCuerpo = useAnimatedStyle(() => ({
    transform: [{ scale: cuerpo.value * respira.value }],
  }));
  const estiloOjos = useAnimatedStyle(() => ({
    transform: [{ translateX: ojoDx.value * 1.8 }, { translateY: ojoDy.value * 2 },
      { scaleX: ojoX.value }, { scaleY: ojoY.value * parpadeo.value }],
  }));
  const estiloBoca = useAnimatedStyle(() => ({
    opacity: (1 - puntos.value) * (1 - error.value),
    transform: [{ scaleX: 1 - 0.28 * boca.value }, { scaleY: 0.2 + 0.8 * boca.value }],
  }));
  const estiloError = useAnimatedStyle(() => ({ opacity: error.value }));
  const estiloGiro = useAnimatedStyle(() => ({
    opacity: giroActivo.value, transform: [{ rotate: `${giroValor.value}deg` }],
  }));
  const onda = (valor: typeof aura1Valor) => useAnimatedStyle(() => ({ // eslint-disable-line react-hooks/rules-of-hooks
    opacity: auraActiva.value * (1 - valor.value) * 0.42,
    transform: [{ scale: 1 + valor.value * 0.32 }],
  }));
  // Un punto se enciende cuando le toca su turno; los tres recorren un ciclo de 3 fases.
  const punto = (indice: number) => useAnimatedStyle(() => { // eslint-disable-line react-hooks/rules-of-hooks
    const distancia = (((fase.value - indice) % 3) + 3) % 3;
    return { opacity: puntos.value * interpolate(distancia, [0, 0.5, 1, 3], [0.35, 1, 0.35, 0.35], Extrapolation.CLAMP) };
  });

  return {
    cuerpo: estiloCuerpo, ojos: estiloOjos, boca: estiloBoca, error: estiloError, giro: estiloGiro,
    aura1: onda(aura1Valor), aura2: onda(aura2Valor),
    punto0: punto(0), punto1: punto(1), punto2: punto(2),
  };
}

const styles = StyleSheet.create({
  // Las capas son solo dibujo: no deben interceptar toques.
  capa: { position: 'absolute', pointerEvents: 'none' },
});
