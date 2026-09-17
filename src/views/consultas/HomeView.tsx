import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView } from 'react-native';
import { Boton } from '../../components/shared/Boton';
import { FichaArea } from '../../components/consultas/FichaArea';
import { AreaJuridica } from '../../models/consultas';
import { alturas, anchos, colores, espaciado, radios, tipografia } from '../../theme';
import { useRouter } from 'expo-router';

export function HomeView() {
  const [pregunta, setPregunta] = useState('');
  const [areaActiva, setAreaActiva] = useState<AreaJuridica>('contratos');
  const router = useRouter();

  const handleConsultar = () => {
    if (!pregunta) return;
    router.push(`/(app)/consulta?q=${encodeURIComponent(pregunta)}&area=${areaActiva}`);
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
        />

        <View style={styles.botonContainer}>
          <Boton 
            titulo="Consultar caso" 
            onPress={handleConsultar} 
          />
        </View>

        <View style={styles.areasContainer}>
          <Text style={styles.areasTitulo}>Seleccioná el área aproximada:</Text>
          <View style={styles.areasGrid}>
            <FichaArea area="contratos" titulo="Contratos" activa={areaActiva === 'contratos'} onPress={() => setAreaActiva('contratos')} />
            <FichaArea area="obligaciones" titulo="Obligaciones" activa={areaActiva === 'obligaciones'} onPress={() => setAreaActiva('obligaciones')} />
            <FichaArea area="derechosReales" titulo="Derechos Reales" activa={areaActiva === 'derechosReales'} onPress={() => setAreaActiva('derechosReales')} />
            <FichaArea area="sucesiones" titulo="Sucesiones" activa={areaActiva === 'sucesiones'} onPress={() => setAreaActiva('sucesiones')} />
          </View>
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
  areasGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
});
