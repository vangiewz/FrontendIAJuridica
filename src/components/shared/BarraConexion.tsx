import React, { useEffect, useState } from 'react';
import { Animated, ActivityIndicator, Pressable, StyleSheet, Text, View, AccessibilityInfo } from 'react-native';
import { useBarraConexion } from '../../controllers/conexion/useBarraConexion';
import { textoConexion } from './textoConexion';
import { anchos, colores, espaciado, radios, tipografia } from '../../theme';

export function BarraConexion() {
  const { estado, reintentar, actualizar } = useBarraConexion();
  const [visible, setVisible] = useState(estado.tipo !== 'oculta');
  const anim = React.useRef(new Animated.Value(estado.tipo !== 'oculta' ? 1 : 0)).current;

  useEffect(() => {
    let unmounted = false;
    const isVisible = estado.tipo !== 'oculta';
    if (isVisible) setVisible(true);

    AccessibilityInfo.isReduceMotionEnabled().then(reduceMotion => {
      if (unmounted) return;
      if (reduceMotion) {
        anim.setValue(isVisible ? 1 : 0);
        if (!isVisible) setVisible(false);
      } else {
        Animated.timing(anim, {
          toValue: isVisible ? 1 : 0,
          duration: 150,
          useNativeDriver: true,
        }).start(() => {
          if (!isVisible) setVisible(false);
        });
      }
    });
    
    return () => { unmounted = true; };
  }, [estado.tipo, anim]);

  if (!visible) return null;

  const { texto, accion } = textoConexion(estado);
  const isFallo = estado.tipo === 'fallo';

  return (
    <Animated.View
      style={[
        styles.raiz,
        isFallo && styles.raizFallo,
        { opacity: anim }
      ]}
      // Sin `accessibilityRole`: "status" es un rol de ARIA y Android lo rechaza en
      // tiempo de ejecucion con IllegalArgumentException, tumbando la app entera.
      // `accessibilityLiveRegion` es el mecanismo correcto en ambas plataformas: anuncia
      // el cambio sin robarle el foco a quien esta escribiendo, y react-native-web lo
      // traduce a aria-live="polite".
      accessibilityLiveRegion="polite"
    >
      <View style={styles.contenido}>
        <View style={styles.etiquetaContainer}>
          {estado.tipo === 'enviando' && (
             <ActivityIndicator size="small" color={colores.tinta} style={styles.spinner} />
          )}
          <Text style={[styles.texto, isFallo && styles.textoFallo]}>{texto}</Text>
        </View>
        {accion && (
          <Pressable
            style={[styles.boton, isFallo && styles.botonFallo]}
            onPress={estado.tipo === 'actualizacion' ? actualizar : reintentar}
            accessibilityRole="button"
          >
            <Text style={[styles.botonTexto, isFallo && styles.botonTextoFallo]}>{accion}</Text>
          </Pressable>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  raiz: {
    backgroundColor: colores.linea,
    paddingVertical: espaciado.s,
    paddingHorizontal: espaciado.m,
  },
  raizFallo: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colores.alerta,
    paddingVertical: espaciado.s - 1,
    paddingHorizontal: espaciado.m - 1,
  },
  contenido: {
    width: '100%',
    maxWidth: anchos.lectura,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
  },
  etiquetaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  spinner: {
    marginRight: espaciado.s,
  },
  texto: {
    fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.escala.nota,
    color: colores.tinta,
  },
  textoFallo: {
    color: colores.alerta,
  },
  boton: {
    borderWidth: 1,
    borderColor: colores.linea,
    borderRadius: radios.m,
    paddingHorizontal: espaciado.m,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
    marginLeft: espaciado.s,
  },
  botonFallo: {
    borderColor: colores.alerta,
  },
  botonTexto: {
    color: colores.tinta,
    fontFamily: tipografia.familias.cuerpoFuerte,
    fontSize: tipografia.escala.nota,
  },
  botonTextoFallo: {
    color: colores.alerta,
  }
});

