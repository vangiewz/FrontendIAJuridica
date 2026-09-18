import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView } from 'react-native';
import { Boton } from '../../components/shared/Boton';
import { MapaAreas } from '../../components/consultas/MapaAreas';
import { useConsulta } from '../../controllers/consultas/useConsulta';
import { alturas, anchos, colores, espaciado, radios, tipografia } from '../../theme';
import { useRouter } from 'expo-router';

export function HomeView() {
  const [pregunta, setPregunta] = useState('');
  const { crear, cargando, error } = useConsulta();
  const router = useRouter();

  const handleConsultar = async () => {
    if (!pregunta || cargando) return;
    const id = await crear(pregunta);
    if (id) {
      router.push(`/(app)/consulta?id=${id}`);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <View style={styles.contenedor}>
        <Text style={styles.titulo}>¿Qué te pasó?</Text>
        
        <TextInput
          style={styles.inputArea}
          multiline
          placeholder="Compré un terreno, pagué todo, pero el vendedor no quiere hacer la transferencia"
          placeholderTextColor={colores.tintaSuave}
          value={pregunta}
          onChangeText={setPregunta}
          textAlignVertical="top"
          editable={!cargando}
        />

        {error && <Text style={styles.error}>{error}</Text>}

        <View style={styles.botonContainer}>
          <Boton 
            titulo={cargando ? "Analizando..." : "Consultar caso"} 
            onPress={handleConsultar} 
          />
        </View>

        <View style={styles.areasContainer}>
          <Text style={styles.areasTitulo}>Áreas cubiertas por el sistema:</Text>
          <MapaAreas areaDetectada={null} />
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
    fontSize: tipografia.escala.pregunta,
    color: colores.tinta,
    marginBottom: espaciado.l,
  },
  inputArea: {
    backgroundColor: colores.superficie,
    borderWidth: 1,
    borderColor: colores.linea,
    borderRadius: radios.m,
    padding: espaciado.m,
    fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.escala.cuerpo,
    color: colores.tinta,
    height: alturas.campoConsulta,
    marginBottom: espaciado.l,
  },
  error: {
    color: colores.alerta,
    marginBottom: espaciado.m,
    fontFamily: tipografia.familias.cuerpo,
  },
  botonContainer: {
    marginBottom: espaciado.xxl,
  },
  areasContainer: {
    marginTop: 'auto',
  },
  areasTitulo: {
    fontFamily: tipografia.familias.cuerpoFuerte,
    fontSize: tipografia.escala.nota,
    color: colores.tintaSuave,
    marginBottom: espaciado.m,
  },
});
