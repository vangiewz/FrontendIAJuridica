import React from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { Boton } from '../../components/shared/Boton';
import { Aviso } from '../../components/shared/Aviso';
import { FichaArchivo } from '../../components/documentos/FichaArchivo';
import { ResultadoCarga } from '../../components/documentos/ResultadoCarga';
import { InformacionExtraida } from '../../components/documentos/InformacionExtraida';
import { AnalisisContrato } from '../../components/documentos/AnalisisContrato';
import { RiesgosContractuales } from '../../components/documentos/RiesgosContractuales';
import { useCargaDocumento } from '../../controllers/documentos/useCargaDocumento';
import { EXTENSIONES_PERMITIDAS, TAMANO_MAXIMO_BYTES, formatearTamano } from '../../models/documentos';
import { anchos, colores, espaciado, tipografia } from '../../theme';

const FORMATOS = EXTENSIONES_PERMITIDAS.map((e) => e.replace('.', '').toUpperCase()).join(', ');

export function CargaDocumentoView() {
  const {
    archivo,
    resultado,
    analisis,
    subiendo,
    extrayendo,
    error,
    errorExtraccion,
    seleccionar,
    analizar,
  } = useCargaDocumento();

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <View style={styles.contenedor}>
        <Text style={styles.titulo}>Analizar documento</Text>
        <Text style={styles.introduccion}>
          Subí un documento jurídico para analizar su contenido.
        </Text>
        <Text style={styles.requisitos}>
          Formatos admitidos: {FORMATOS}. Tamaño máximo: {formatearTamano(TAMANO_MAXIMO_BYTES)}.
        </Text>

        {error ? <Aviso mensaje={error} tipo="error" /> : null}

        <View style={styles.accionSeleccion}>
          <Boton
            titulo={archivo ? 'Elegir otro documento' : 'Seleccionar documento'}
            onPress={seleccionar}
            variante="secundario"
          />
        </View>

        {archivo ? <FichaArchivo archivo={archivo} /> : null}

        {archivo ? (
          <View style={styles.accionPrincipal}>
            <Boton
              titulo={subiendo ? 'Analizando documento...' : 'Analizar documento'}
              onPress={analizar}
              cargando={subiendo}
            />
            {subiendo ? (
              <Text style={styles.progreso}>
                Estamos subiendo el archivo y extrayendo su texto. Puede tardar unos segundos.
              </Text>
            ) : null}
          </View>
        ) : null}

        {resultado ? <ResultadoCarga documento={resultado} /> : null}

        {extrayendo ? (
          <View style={styles.extrayendo}>
            <ActivityIndicator color={colores.accion} />
            <Text style={styles.progresoExtraccion}>
              Extrayendo la información jurídica del documento...
            </Text>
          </View>
        ) : null}

        {errorExtraccion ? <Aviso mensaje={errorExtraccion} tipo="error" /> : null}

        {/* Las tres secciones leen el mismo `analisis`: una sola llamada al endpoint. */}
        {analisis ? <InformacionExtraida analisis={analisis} /> : null}

        {analisis ? <AnalisisContrato analisis={analisis} /> : null}

        {analisis ? <RiesgosContractuales analisis={analisis} /> : null}

        <View style={styles.legalNotice}>
          <Aviso
            tipo="info"
            mensaje="El sistema es una herramienta de apoyo y no sustituye el criterio profesional de un abogado. Toda respuesta jurídica debe ser verificada."
          />
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
    marginBottom: espaciado.s,
  },
  requisitos: {
    fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.escala.nota,
    color: colores.tintaSuave,
    marginBottom: espaciado.xl,
  },
  accionSeleccion: {
    marginBottom: espaciado.l,
  },
  accionPrincipal: {
    marginBottom: espaciado.l,
  },
  extrayendo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.m,
    marginBottom: espaciado.l,
  },
  progreso: {
    fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.escala.nota,
    color: colores.tintaSuave,
    marginTop: espaciado.m,
  },
  progresoExtraccion: {
    flex: 1,
    fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.escala.nota,
    color: colores.tintaSuave,
  },
  legalNotice: {
    marginTop: 'auto',
    paddingTop: espaciado.xxl,
  },
});
