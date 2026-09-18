import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { anchos, colores, espaciado, radios, tipografia } from '../../theme';
import { Boton } from '../../components/shared/Boton';
import { useHistorial } from '../../controllers/consultas/useHistorial';
import { FichaHistorial } from '../../components/consultas/FichaHistorial';

export function HistorialView() {
  const router = useRouter();
  const { historial, cargando, error, cargar } = useHistorial();

  useEffect(() => {
    cargar();
  }, []);

  if (cargando && historial.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colores.accion} />
      </View>
    );
  }

  if (error && historial.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
        <Boton titulo="Reintentar" onPress={cargar} />
      </View>
    );
  }

  if (historial.length === 0) {
    return (
      <View style={styles.center}>
        <View style={styles.estadoVacio}>
          <Text style={styles.tituloVacio}>Todavía no hiciste ninguna consulta</Text>
          <Text style={styles.descripcionVacio}>
            Acá vas a poder ver el registro de todos los casos que analicemos juntos, para poder volver a consultarlos cuando lo necesites.
          </Text>
          <Boton 
            titulo="Hacer una consulta nueva" 
            onPress={() => router.push('/(app)/')} 
          />
        </View>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <View style={styles.contenedor}>
        <Text style={styles.titulo}>Tu historial de consultas</Text>
        
        {historial.map((item) => (
          <FichaHistorial
            key={item.id}
            item={item}
            onPress={() => router.push(`/(app)/consulta?id=${item.id}`)}
          />
        ))}
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
    maxWidth: anchos.formulario || 600,
    width: '100%',
    alignSelf: 'center',
  },
  center: {
    flex: 1,
    backgroundColor: colores.papel,
    alignItems: 'center',
    justifyContent: 'center',
    padding: espaciado.xl,
  },
  errorText: {
    color: colores.alerta,
    fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.escala.cuerpo,
    marginBottom: espaciado.l,
  },
  estadoVacio: {
    maxWidth: anchos.formulario || 600,
    alignItems: 'center',
    textAlign: 'center',
  },
  tituloVacio: {
    fontFamily: tipografia.familias.titulo,
    fontSize: tipografia.escala.titulo,
    color: colores.tinta,
    marginBottom: espaciado.m,
    textAlign: 'center',
  },
  descripcionVacio: {
    fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.escala.cuerpo,
    color: colores.tintaSuave,
    textAlign: 'center',
    marginBottom: espaciado.xl,
    lineHeight: 24,
  },
  titulo: {
    fontFamily: tipografia.familias.titulo,
    fontSize: tipografia.escala.titulo,
    color: colores.tinta,
    marginBottom: espaciado.xl,
  },
});
