import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Boton } from '../../components/shared/Boton';
import { Aviso } from '../../components/shared/Aviso';
import { SelectorDocumento } from '../../components/documentos/SelectorDocumento';
import { FichaDiferencia } from '../../components/documentos/FichaDiferencia';
import { useComparacion } from '../../controllers/documentos/useComparacion';
import { anchos, colores, espaciado, radios, tipografia } from '../../theme';

export function ComparacionView() {
  const router = useRouter();
  const {
    documentos,
    idA,
    idB,
    comparacion,
    cargandoLista,
    comparando,
    error,
    cargarDocumentos,
    elegirA,
    elegirB,
    comparar,
  } = useComparacion();

  useEffect(() => {
    cargarDocumentos();
  }, []);

  if (cargandoLista && documentos.length === 0) {
    return (
      <View style={styles.centro}>
        <ActivityIndicator size="large" color={colores.accion} />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <View style={styles.contenedor}>
        <Text style={styles.titulo}>Comparar documentos</Text>
        <Text style={styles.introduccion}>
          Elegí dos documentos que ya subiste para ver qué cambió entre ellos.
        </Text>

        {error ? <Aviso mensaje={error} tipo="error" /> : null}

        {documentos.length < 2 ? (
          <View style={styles.vacio}>
            <Text style={styles.vacioTexto}>
              Necesitás al menos dos documentos procesados para poder compararlos. Subilos desde
              la pantalla de análisis de documentos.
            </Text>
            <Boton titulo="Ir a analizar documentos" onPress={() => router.push('/(app)/(tabs)/documentos')} />
          </View>
        ) : (
          <>
            <SelectorDocumento
              rotulo="DOCUMENTO A"
              documentos={documentos}
              seleccionadoId={idA}
              onElegir={elegirA}
            />
            <SelectorDocumento
              rotulo="DOCUMENTO B"
              documentos={documentos}
              seleccionadoId={idB}
              onElegir={elegirB}
            />

            <View style={styles.accion}>
              <Boton
                titulo={comparando ? 'Comparando documentos...' : 'Comparar documentos'}
                onPress={comparar}
                cargando={comparando}
              />
              {!idA || !idB ? (
                <Text style={styles.ayuda}>Elegí un documento en cada lista para continuar.</Text>
              ) : null}
            </View>
          </>
        )}

        {comparacion ? (
          <View style={styles.resultado}>
            <Text style={styles.tituloResultado}>COMPARACIÓN DE DOCUMENTOS</Text>

            <View style={styles.dato}>
              <Text style={styles.datoEtiqueta}>Documento A</Text>
              <Text style={styles.datoValor}>{comparacion.nombre_a}</Text>
            </View>
            <View style={styles.dato}>
              <Text style={styles.datoEtiqueta}>Documento B</Text>
              <Text style={styles.datoValor}>{comparacion.nombre_b}</Text>
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
                    : 'No se reconocieron cláusulas en ambos documentos: la comparación se hizo por párrafos.'}
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
        ) : null}
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
  },
  titulo: {
    fontFamily: tipografia.familias.titulo,
    fontSize: tipografia.escala.titulo,
    color: colores.tinta,
    marginBottom: espaciado.s,
  },
  introduccion: {
    fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.escala.cuerpo,
    color: colores.tinta,
    marginBottom: espaciado.xl,
  },
  vacio: {
    gap: espaciado.l,
  },
  vacioTexto: {
    fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.escala.cuerpo,
    color: colores.tintaSuave,
    lineHeight: 24,
  },
  accion: {
    marginBottom: espaciado.l,
  },
  ayuda: {
    fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.escala.nota,
    color: colores.tintaSuave,
    marginTop: espaciado.s,
  },
  resultado: {
    backgroundColor: colores.superficie,
    borderWidth: 1,
    borderColor: colores.linea,
    borderRadius: radios.m,
    padding: espaciado.l,
    marginBottom: espaciado.l,
  },
  tituloResultado: {
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
