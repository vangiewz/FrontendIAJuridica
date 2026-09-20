import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { BorradorView } from '../../src/views/generacion/BorradorView';

export default function BorradorScreen() {
  const params = useLocalSearchParams();
  const id = Array.isArray(params.id) ? params.id[0] : (params.id || '');

  return <BorradorView id={id} />;
}
