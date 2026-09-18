import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { anchos, colores, espaciado, radios, tipografia } from '../../theme';
import { Aviso } from '../../components/shared/Aviso';
import { TerminosDetectados } from '../../components/consultas/TerminosDetectados';
import { MapaAreas } from '../../components/consultas/MapaAreas';
import { ListaFuentes } from '../../components/consultas/ListaFuentes';
import { useConsulta } from '../../controllers/consultas/useConsulta';

export function ConsultaView() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { consulta, cargando, error, cargar } = useConsulta();

  useEffect(() => {
    if (id) cargar(id);
  }, [id]);

  if (cargando) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colores.accion} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (!consulta) return null;

  const sinArea = !consulta.area_juridica;
  const sinFuentes = consulta.fuentes.length === 0;

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <View style={styles.contenedor}>
        <Text style={styles.titulo}>Lo que dice el Código Civil sobre tu caso</Text>
        
        <View style={styles.preguntaCard}>
          <TerminosDetectados 
            texto={consulta.texto} 
            terminos={consulta.terminos_detectados} 
            areaDetectada={consulta.area_juridica} 
          />
        </View>

        <MapaAreas areaDetectada={consulta.area_juridica} />

        {sinArea ? (
          <Text style={styles.estadoVacio}>
            No pudimos identificar de qué trata tu consulta. Contanos qué pasó con más detalle: qué hiciste, con quién y qué salió mal.
          </Text>
        ) : sinFuentes ? (
          <Text style={styles.estadoVacio}>
            Identificamos que tu caso es de {(consulta.area_juridica ?? '').replace('_', ' ')}, pero no encontramos artículos que se ajusten. Probá contando tu situación con más detalle.
          </Text>
        ) : (
          <>
            <Text style={styles.lineaHonesta}>
              Todavía no redactamos una explicación de tu caso. Estos son los artículos que lo regulan.
            </Text>
            <ListaFuentes fuentes={consulta.fuentes} areaDetectada={consulta.area_juridica} />
          </>
        )}

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
    maxWidth: anchos.lectura || 800,
    width: '100%',
    alignSelf: 'center',
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colores.papel,
  },
  errorText: {
    color: colores.alerta,
    fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.escala.cuerpo,
  },
  titulo: {
    fontFamily: tipografia.familias.titulo,
    fontSize: tipografia.escala.titulo,
    color: colores.tinta,
    marginBottom: espaciado.l,
  },
  preguntaCard: {
    backgroundColor: colores.superficie,
    padding: espaciado.l,
    borderWidth: 1,
    borderColor: colores.linea,
    borderRadius: radios.m,
    marginBottom: espaciado.xl,
  },
  estadoVacio: {
    fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.escala.cuerpo,
    color: colores.tinta,
    marginTop: espaciado.xl,
    lineHeight: 24,
  },
  lineaHonesta: {
    fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.escala.nota,
    color: colores.tintaSuave,
    marginTop: espaciado.xl,
  },
  legalNotice: {
    marginTop: 'auto',
    paddingTop: espaciado.xxl,
  },
});
