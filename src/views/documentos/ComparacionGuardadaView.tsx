import React from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { Boton } from '../../components/shared/Boton';
import { FichaDiferencia } from '../../components/documentos/FichaDiferencia';
import { useComparacionGuardada } from '../../controllers/documentos/useComparacionGuardada';
import { anchos, colores, espaciado, radios, tipografia } from '../../theme';

interface Props {
  comparacionId: string;
}

/** Una comparación del historial, releída de lo guardado. No se vuelve a comparar. */
export function ComparacionGuardadaView({ comparacionId }: Props) {
  const { comparacion, cargando, error } = useComparacionGuardada(comparacionId);

  if (cargando) {
    return (
      <View style={styles.centro}>
        <ActivityIndicator size="large" color={colores.accion} />
      </View>
    );
  }

  if (error || !comparacion) {
    return (
      <View style={styles.centro}>
        <Text style={styles.error}>{error ?? 'No encontramos la comparación.'}</Text>
        <Boton titulo="Volver" onPress={() => router.back()} variante="secundario" />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <View style={styles.contenedor}>
        <View style={styles.card}>
          <Text style={styles.tituloSeccion}>COMPARACIÓN DE DOCUMENTOS</Text>

          <View style={styles.dato}>
            <Text style={styles.datoEtiqueta}>Documento A</Text>
            <Text style={styles.datoValor}>{comparacion.nombre_a}</Text>
          </View>
          <View style={styles.dato}>
            <Text style={styles.datoEtiqueta}>Documento B</Text>
            <Text style={styles.datoValor}>{comparacion.nombre_b}</Text>
          </View>
          <View style={styles.dato}>
            <Text style={styles.datoEtiqueta}>Realizada el</Text>
            <Text style={styles.datoValor}>
              {new Date(comparacion.creada_en).toLocaleString()}
            </Text>
          </View>

          {comparacion.cantidad_cambios === 0 ? (
            <Text style={styles.sinCambios}>
              No se detectaron diferencias entre los documentos.
            </Text>
          ) : (
            <>
              <Text style={styles.conteo}>
                Cambios detectados: {comparacion.cantidad_cambios}
              </Text>
              <Text style={styles.estrategia}>
                {comparacion.estrategia === 'clausulas'
                  ? 'Comparación realizada cláusula por cláusula.'
                  : 'La comparación se hizo por párrafos.'}
              </Text>
              {comparacion.diferencias.map((diferencia, indice) => (
                <FichaDiferencia
                  key={`${diferencia.tipo}-${diferencia.ubicacion}-${indice}`}
                  diferencia={diferencia}
                />
              ))}
            </>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    backgroundColor: colores.papel,
  },
  contenedor: {
    padding: espaciado.xl,
    maxWidth: anchos.panel,
    width: '100%',
    alignSelf: 'center',
    flex: 1,
  },
  centro: {
    flex: 1,
    backgroundColor: colores.papel,
    alignItems: 'center',
    justifyContent: 'center',
    padding: espaciado.xl,
    gap: espaciado.l,
  },
  error: {
    fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.escala.cuerpo,
    color: colores.alerta,
    textAlign: 'center',
  },
  card: {
    backgroundColor: colores.superficie,
    borderWidth: 1,
    borderColor: colores.linea,
    borderRadius: radios.m,
    padding: espaciado.l,
  },
  tituloSeccion: {
    fontFamily: tipografia.familias.cuerpoFuerte,
    fontSize: tipografia.escala.nota,
    color: colores.tintaSuave,
    letterSpacing: 1,
    marginBottom: espaciado.l,
  },
  dato: {
    marginBottom: espaciado.m,
  },
  datoEtiqueta: {
    fontFamily: tipografia.familias.cuerpoFuerte,
    fontSize: tipografia.escala.nota,
    color: colores.tintaSuave,
    marginBottom: espaciado.xs,
  },
  datoValor: {
    fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.escala.cuerpo,
    color: colores.tinta,
  },
  sinCambios: {
    fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.escala.cuerpo,
    color: colores.tinta,
    lineHeight: 24,
    borderTopWidth: 1,
    borderTopColor: colores.linea,
    paddingTop: espaciado.m,
  },
  conteo: {
    fontFamily: tipografia.familias.titulo,
    fontSize: tipografia.escala.cuerpo,
    color: colores.tinta,
    borderTopWidth: 1,
    borderTopColor: colores.linea,
    paddingTop: espaciado.m,
    marginBottom: espaciado.xs,
  },
  estrategia: {
    fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.escala.nota,
    color: colores.tintaSuave,
    marginBottom: espaciado.l,
  },
});
