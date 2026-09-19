import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { ComparacionGuardadaView } from '../../src/views/documentos/ComparacionGuardadaView';

export default function ComparacionGuardadaScreen() {
  const params = useLocalSearchParams();
  const id = Array.isArray(params.id) ? params.id[0] : (params.id || '');

  return <ComparacionGuardadaView comparacionId={id} />;
}
