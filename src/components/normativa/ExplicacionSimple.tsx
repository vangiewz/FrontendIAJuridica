import React, { useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Boton } from '../shared/Boton';
import { ExplicacionArticulo } from '../../models/normativa';
import { explicarArticulo } from '../../services/normativa';
import { colores, espaciado, interlineado, radios, tipografia } from '../../theme';

interface Props {
  codigo: string;
  numero: number;
}

/**
 * HU-13. El texto original queda arriba, intacto; esto es una lectura en palabras
 * corrientes que se pide aparte. Si la IA local no esta disponible, el articulo se
 * sigue leyendo igual: lo unico que falta es esta ayuda.
 */
export function ExplicacionSimple({ codigo, numero }: Props) {
  const [explicacion, setExplicacion] = useState<ExplicacionArticulo | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pedir = async () => {
    setCargando(true);
    setError(null);
    try {
      setExplicacion(await explicarArticulo(codigo, numero));
    } catch (e: any) {
      setError(e.mensaje || 'No se pudo generar la explicación');
    } finally {
      setCargando(false);
    }
  };

  if (cargando) {
    return (
      <View style={styles.bloque}>
        <ActivityIndicator color={colores.accion} />
        <Text style={styles.nota}>Preparando una explicación sencilla...</Text>
      </View>
    );
  }

  if (!explicacion) {
    return (
      <View style={styles.bloque}>
        <Text style={styles.titulo}>¿Te cuesta leer este artículo?</Text>
        <Text style={styles.nota}>
          Podemos explicarlo en palabras corrientes. El texto original de arriba no cambia.
        </Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <View style={styles.boton}>
          <Boton titulo="Explicar en lenguaje sencillo" onPress={pedir} />
        </View>
      </View>
    );
  }

  if (!explicacion.disponible) {
    return (
      <View style={styles.bloque}>
        <Text style={styles.titulo}>Explicación no disponible</Text>
        <Text style={styles.nota}>{explicacion.motivo}</Text>
      </View>
    );
  }

  return (
    <View style={styles.bloque}>
      <Text style={styles.titulo}>En palabras sencillas</Text>
      <Text style={styles.parrafo}>{explicacion.explicacion}</Text>
      {explicacion.ejemplo ? (
        <>
          <Text style={styles.subtitulo}>Un ejemplo</Text>
          <Text style={styles.parrafo}>{explicacion.ejemplo}</Text>
        </>
      ) : null}
      <Text style={styles.nota}>
        Explicación generada por la IA local. Lo que tiene valor legal es el texto original.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bloque: {
    backgroundColor: colores.superficie,
    borderWidth: 1,
    borderColor: colores.linea,
    borderRadius: radios.m,
    padding: espaciado.l,
    marginTop: espaciado.xl,
  },
  titulo: {
    fontFamily: tipografia.familias.cuerpoFuerte,
    fontSize: tipografia.escala.cuerpo,
    color: colores.tinta,
    marginBottom: espaciado.s,
  },
  subtitulo: {
    fontFamily: tipografia.familias.cuerpoFuerte,
    fontSize: tipografia.escala.nota,
    color: colores.tintaSuave,
    marginTop: espaciado.m,
    marginBottom: espaciado.xs,
  },
  parrafo: {
    fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.escala.cuerpo,
    color: colores.tinta,
    lineHeight: interlineado.cuerpo,
  },
  nota: {
    fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.escala.nota,
    color: colores.tintaSuave,
    marginTop: espaciado.m,
    lineHeight: 20,
  },
  error: {
    fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.escala.nota,
    color: colores.alerta,
    marginTop: espaciado.s,
  },
  boton: {
    marginTop: espaciado.m,
  },
});
