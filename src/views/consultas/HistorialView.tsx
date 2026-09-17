import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { anchos, colores, espaciado, interlineado, tipografia } from '../../theme';
import { Boton } from '../../components/shared/Boton';
import { useRouter } from 'expo-router';

export function HistorialView() {
  const router = useRouter();

  return (
    <View style={styles.contenedor}>
      <View style={styles.estadoVacio}>
        <Text style={styles.titulo}>Todavía no hiciste ninguna consulta</Text>
        <Text style={styles.descripcion}>
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

const styles = StyleSheet.create({
  contenedor: {
    flex: 1,
    backgroundColor: colores.papel,
    alignItems: 'center',
    justifyContent: 'center',
    padding: espaciado.xl,
  },
  estadoVacio: {
    maxWidth: anchos.formulario,
    alignItems: 'center',
    textAlign: 'center',
  },
  titulo: {
    fontFamily: tipografia.familias.titulo,
    fontSize: tipografia.escala.titulo,
    color: colores.tinta,
    marginBottom: espaciado.m,
    textAlign: 'center',
  },
  descripcion: {
    fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.escala.cuerpo,
    color: colores.tintaSuave,
    textAlign: 'center',
    marginBottom: espaciado.xl,
    lineHeight: interlineado.cuerpo,
  },
});
