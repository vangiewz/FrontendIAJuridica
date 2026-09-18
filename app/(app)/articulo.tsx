import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { ArticuloView } from '../../src/views/normativa/ArticuloView';

export default function ArticuloRoute() {
  const params = useLocalSearchParams();
  const codigo = Array.isArray(params.codigo) ? params.codigo[0] : (params.codigo || '');
  const numeroParam = Array.isArray(params.numero) ? params.numero[0] : params.numero;
  const numero = Number(numeroParam);

  return <ArticuloView codigo={codigo} numero={numero} />;
}
