import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { DocumentoGuardadoView } from '../../src/views/documentos/DocumentoGuardadoView';

export default function DocumentoGuardadoScreen() {
  const params = useLocalSearchParams();
  const id = Array.isArray(params.id) ? params.id[0] : (params.id || '');

  return <DocumentoGuardadoView documentoId={id} />;
}
