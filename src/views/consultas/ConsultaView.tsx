import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { anchos, colores, espaciado, radios, tipografia } from '../../theme';
import { Aviso } from '../../components/shared/Aviso';

export function ConsultaView() {
  const params = useLocalSearchParams();
  
  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <View style={styles.contenedor}>
        <Text style={styles.titulo}>Análisis de la consulta</Text>
        
        <View style={styles.preguntaCard}>
          <Text style={styles.label}>Tu consulta:</Text>
          <Text style={styles.pregunta}>{params.q}</Text>
          <Text style={styles.areaBadge}>Área: {params.area}</Text>
        </View>

        <Aviso
          tipo="info"
          mensaje="Todavía no podemos analizar tu consulta: la base del Código Civil aún no está cargada en el sistema."
        />

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
    maxWidth: anchos.lectura,
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
  preguntaCard: {
    backgroundColor: colores.superficie,
    padding: espaciado.l,
    borderWidth: 1,
    borderColor: colores.linea,
    borderRadius: radios.m,
    marginBottom: espaciado.xl,
  },
  label: {
    fontFamily: tipografia.familias.cuerpoFuerte,
    fontSize: tipografia.escala.nota,
    color: colores.tintaSuave,
    marginBottom: espaciado.xs,
  },
  pregunta: {
    fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.escala.cuerpo,
    color: colores.tinta,
    marginBottom: espaciado.m,
  },
  areaBadge: {
    fontFamily: tipografia.familias.cuerpoFuerte,
    fontSize: tipografia.escala.nota,
    color: colores.accion,
  },
  legalNotice: {
    marginTop: 'auto',
  },
});
