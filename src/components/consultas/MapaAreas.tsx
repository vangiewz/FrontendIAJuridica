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
      <FichaArea area="contratos" titulo="Contratos" activa={areaDetectada === 'contratos'} />
      <FichaArea area="obligaciones" titulo="Obligaciones" activa={areaDetectada === 'obligaciones'} />
      <FichaArea area="derechos_reales" titulo="Derechos Reales" activa={areaDetectada === 'derechos_reales'} />
      <FichaArea area="sucesiones" titulo="Sucesiones" activa={areaDetectada === 'sucesiones'} />
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
});
