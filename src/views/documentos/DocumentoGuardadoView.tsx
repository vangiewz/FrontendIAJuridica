import React from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useVolver } from '../../controllers/navegacion/useVolver';
import { EnlaceVolver } from '../../components/shared/EnlaceVolver';
import { Boton } from '../../components/shared/Boton';
import { Aviso } from '../../components/shared/Aviso';
import { ResultadoCarga } from '../../components/documentos/ResultadoCarga';
import { InformacionExtraida } from '../../components/documentos/InformacionExtraida';
import { AnalisisContrato } from '../../components/documentos/AnalisisContrato';
import { RiesgosContractuales } from '../../components/documentos/RiesgosContractuales';
import { useDocumentoGuardado } from '../../controllers/documentos/useDocumentoGuardado';
import { anchos, colores, espaciado, tipografia } from '../../theme';

interface Props {
  documentoId: string;
}

/**
 * Un documento del historial, reconstruido con lo que ya esta guardado.
 * No se vuelve a subir el archivo ni se vuelve a ejecutar el analisis.
 */
export function DocumentoGuardadoView({ documentoId }: Props) {
  const volver = useVolver('/(app)/(tabs)/historial');
  const { documento, analisis, cargando, error } = useDocumentoGuardado(documentoId);

  if (cargando) {
    return (
      <View style={styles.centro}>
        <ActivityIndicator size="large" color={colores.accion} />
      </View>
    );
  }

  if (error || !documento) {
    return (
      <View style={styles.centro}>
        <Text style={styles.error}>{error ?? 'No encontramos el documento.'}</Text>
        <Boton titulo="Volver" onPress={volver} variante="secundario" />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <View style={styles.contenedor}>
        <EnlaceVolver respaldo="/(app)/(tabs)/historial" etiqueta="Volver al historial" />
        <Text style={styles.titulo}>Documento del historial</Text>
        <Text style={styles.subtitulo}>
          Subido el {new Date(documento.subido_en).toLocaleString()}
        </Text>

        {/* Mismos componentes que la pantalla de análisis: tipo, estado y datos. */}
        <ResultadoCarga documento={documento} />

        {analisis ? (
          <>
            <InformacionExtraida analisis={analisis} />
            <AnalisisContrato analisis={analisis} />
            <RiesgosContractuales analisis={analisis} />
          </>
        ) : documento.estado === 'completado' ? (
          <Aviso
            tipo="info"
            mensaje="Este documento todavía no fue analizado. Podés analizarlo desde la pantalla de análisis de documentos."
          />
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
    padding: espaciado.xl,
    gap: espaciado.l,
  },
  error: {
    fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.escala.cuerpo,
    color: colores.alerta,
    textAlign: 'center',
  },
  titulo: {
    fontFamily: tipografia.familias.titulo,
    fontSize: tipografia.escala.titulo,
    color: colores.tinta,
    marginBottom: espaciado.xs,
  },
  subtitulo: {
    fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.escala.nota,
    color: colores.tintaSuave,
    marginBottom: espaciado.l,
  },
});
