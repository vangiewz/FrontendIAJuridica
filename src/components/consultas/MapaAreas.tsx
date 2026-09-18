import React from 'react';
import { View, StyleSheet } from 'react-native';
import { AreaJuridica } from '../../models/consultas';
import { FichaArea } from './FichaArea';

interface Props {
  areaDetectada: AreaJuridica | null;
}

export function MapaAreas({ areaDetectada }: Props) {
  return (
    <View style={styles.contenedor}>
      <FichaArea area={"contratos" as any} titulo="Contratos" activa={areaDetectada === 'contratos'} onPress={() => {}} />
      <FichaArea area={"obligaciones" as any} titulo="Obligaciones" activa={areaDetectada === 'obligaciones'} onPress={() => {}} />
      <FichaArea area={"derechosReales" as any} titulo="Derechos Reales" activa={areaDetectada === 'derechos_reales'} onPress={() => {}} />
      <FichaArea area={"sucesiones" as any} titulo="Sucesiones" activa={areaDetectada === 'sucesiones'} onPress={() => {}} />
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
});
