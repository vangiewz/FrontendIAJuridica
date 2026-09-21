import React from 'react';
import { Slot } from 'expo-router';
import { useFonts } from 'expo-font';
import { Archivo_900Black } from '@expo-google-fonts/archivo';
import { AtkinsonHyperlegibleNext_400Regular, AtkinsonHyperlegibleNext_700Bold } from '@expo-google-fonts/atkinson-hyperlegible-next';
import { SesionProvider } from '../src/controllers/auth/SesionContext';
import { RecibidosProvider } from '../src/controllers/archivos/RecibidosContext';
import { RecordatoriosProvider } from '../src/controllers/recordatorios/RecordatoriosContext';

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Archivo_900Black,
    AtkinsonHyperlegibleNext_400Regular,
    AtkinsonHyperlegibleNext_700Bold,
  });

  if (!fontsLoaded) {
    return null;
  }

  return (
    <SesionProvider>
      {/* Archivos compartidos desde otras apps: por encima de la sesión y de las rutas, para no perderlos en el arranque. */}
      <RecibidosProvider>
        {/* Recordatorios locales y la notificación que abrió la app: también por encima de la sesión. */}
        <RecordatoriosProvider>
          <Slot />
        </RecordatoriosProvider>
      </RecibidosProvider>
    </SesionProvider>
  );
}
