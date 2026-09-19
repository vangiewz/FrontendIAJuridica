import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { anchos, colores, espaciado, radios, tipografia } from '../../theme';
import { Boton } from '../../components/shared/Boton';
import { useHistorial } from '../../controllers/consultas/useHistorial';
import { useHistorialDocumentos } from '../../controllers/documentos/useHistorialDocumentos';
import { FichaHistorial } from '../../components/consultas/FichaHistorial';
import { FichaHistorialDocumento } from '../../components/documentos/FichaHistorialDocumento';
import { FichaHistorialComparacion } from '../../components/documentos/FichaHistorialComparacion';

type Pestana = 'consultas' | 'documentos' | 'comparaciones';

const PESTANAS: { clave: Pestana; etiqueta: string }[] = [
  { clave: 'consultas', etiqueta: 'Consultas' },
  { clave: 'documentos', etiqueta: 'Documentos' },
  { clave: 'comparaciones', etiqueta: 'Comparaciones' },
];

function EstadoVacio({ titulo, descripcion, accion }: {
  titulo: string;
  descripcion: string;
  accion: { titulo: string; onPress: () => void };
}) {
  return (
    <View style={styles.vacio}>
      <Text style={styles.vacioTitulo}>{titulo}</Text>
      <Text style={styles.vacioTexto}>{descripcion}</Text>
      <Boton titulo={accion.titulo} onPress={accion.onPress} />
    </View>
  );
}

export function HistorialView() {
  const router = useRouter();
  const [pestana, setPestana] = useState<Pestana>('consultas');

  const { historial, cargando, error, cargar } = useHistorial();
  const {
    documentos,
    comparaciones,
    cargando: cargandoDocs,
    error: errorDocs,
    cargar: cargarDocs,
  } = useHistorialDocumentos();

  useEffect(() => {
    cargar();
    cargarDocs();
  }, []);

  const cargandoPestana = pestana === 'consultas' ? cargando : cargandoDocs;
  const errorPestana = pestana === 'consultas' ? error : errorDocs;
  const reintentar = pestana === 'consultas' ? cargar : cargarDocs;

  const vacioActual =
    (pestana === 'consultas' && historial.length === 0) ||
    (pestana === 'documentos' && documentos.length === 0) ||
    (pestana === 'comparaciones' && comparaciones.length === 0);

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <View style={styles.contenedor}>
        <Text style={styles.titulo}>Historial</Text>

        <View style={styles.pestanas}>
          {PESTANAS.map(({ clave, etiqueta }) => {
            const activa = clave === pestana;
            return (
              <TouchableOpacity
                key={clave}
                style={[styles.pestana, activa && styles.pestanaActiva]}
                activeOpacity={0.8}
                onPress={() => setPestana(clave)}
              >
                <Text style={[styles.pestanaTexto, activa && styles.pestanaTextoActivo]}>
                  {etiqueta}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {cargandoPestana && vacioActual ? (
          <View style={styles.centro}>
            <ActivityIndicator size="large" color={colores.accion} />
          </View>
        ) : errorPestana && vacioActual ? (
          <View style={styles.centro}>
            <Text style={styles.error}>{errorPestana}</Text>
            <Boton titulo="Reintentar" onPress={reintentar} />
          </View>
        ) : (
          <>
            {pestana === 'consultas' &&
              (historial.length === 0 ? (
                <EstadoVacio
                  titulo="No tienes consultas anteriores."
                  descripcion="Acá vas a poder ver el registro de todos los casos que analicemos juntos, para volver a consultarlos cuando lo necesites."
                  accion={{ titulo: 'Hacer una consulta nueva', onPress: () => router.push('/(app)/') }}
                />
              ) : (
                historial.map((item) => (
                  <FichaHistorial
                    key={item.id}
                    item={item}
                    onPress={() => router.push(`/(app)/consulta?id=${item.id}`)}
                  />
                ))
              ))}

            {pestana === 'documentos' &&
              (documentos.length === 0 ? (
                <EstadoVacio
                  titulo="No tienes documentos procesados."
                  descripcion="Cuando subas un documento jurídico vas a poder volver a abrir su análisis desde acá, sin subirlo de nuevo."
                  accion={{ titulo: 'Analizar un documento', onPress: () => router.push('/(app)/documentos') }}
                />
              ) : (
                documentos.map((item) => (
                  <FichaHistorialDocumento
                    key={item.id}
                    item={item}
                    onPress={() => router.push(`/(app)/documento?id=${item.id}`)}
                  />
                ))
              ))}

            {pestana === 'comparaciones' &&
              (comparaciones.length === 0 ? (
                <EstadoVacio
                  titulo="No tienes comparaciones realizadas."
                  descripcion="Cuando compares dos documentos vas a poder volver a abrir el resultado desde acá."
                  accion={{ titulo: 'Comparar documentos', onPress: () => router.push('/(app)/comparar') }}
                />
              ) : (
                comparaciones.map((item) => (
                  <FichaHistorialComparacion
                    key={item.id}
                    item={item}
                    onPress={() => router.push(`/(app)/comparacion?id=${item.id}`)}
                  />
                ))
              ))}
          </>
        )}
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
    marginBottom: espaciado.l,
  },
  pestanas: {
    flexDirection: 'row',
    gap: espaciado.s,
    marginBottom: espaciado.xl,
    flexWrap: 'wrap',
  },
  pestana: {
    borderWidth: 1,
    borderColor: colores.linea,
    borderRadius: radios.round,
    paddingVertical: espaciado.s,
    paddingHorizontal: espaciado.m,
  },
  pestanaActiva: {
    backgroundColor: colores.accion,
    borderColor: colores.accion,
  },
  pestanaTexto: {
    fontFamily: tipografia.familias.cuerpoFuerte,
    fontSize: tipografia.escala.nota,
    color: colores.tintaSuave,
  },
  pestanaTextoActivo: {
    color: colores.accionTexto,
  },
  centro: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: espaciado.xxl,
    gap: espaciado.l,
  },
  error: {
    fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.escala.cuerpo,
    color: colores.alerta,
    textAlign: 'center',
  },
  vacio: {
    alignItems: 'center',
    paddingVertical: espaciado.xl,
    gap: espaciado.l,
  },
  vacioTitulo: {
    fontFamily: tipografia.familias.titulo,
    fontSize: tipografia.escala.subtitulo,
    color: colores.tinta,
    textAlign: 'center',
  },
  vacioTexto: {
    fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.escala.cuerpo,
    color: colores.tintaSuave,
    textAlign: 'center',
    lineHeight: 24,
  },
});
