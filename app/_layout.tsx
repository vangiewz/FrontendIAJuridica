import React from 'react';
import { Slot } from 'expo-router';
import { useFonts } from 'expo-font';
import { Archivo_900Black } from '@expo-google-fonts/archivo';
import { AtkinsonHyperlegibleNext_400Regular, AtkinsonHyperlegibleNext_700Bold } from '@expo-google-fonts/atkinson-hyperlegible-next';
import { SesionProvider } from '../src/controllers/auth/SesionContext';
import { PersistenciaProvider } from '../src/controllers/persistencia/PersistenciaProvider';

export default function RootLayout() {
  const [fontsLoaded, error] = useFonts({
    Archivo_900Black,
    AtkinsonHyperlegibleNext_400Regular,
    AtkinsonHyperlegibleNext_700Bold,
  });

  if (!fontsLoaded && !error) {
    return null;
  }

  return (
    <PersistenciaProvider>
      <SesionProvider>
        <Slot />
      </SesionProvider>
    </PersistenciaProvider>
  );
}
