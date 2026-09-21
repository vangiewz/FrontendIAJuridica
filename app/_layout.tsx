import React from 'react';
import { Slot } from 'expo-router';
import { useFonts } from 'expo-font';
import { Archivo_900Black } from '@expo-google-fonts/archivo';
import { AtkinsonHyperlegibleNext_400Regular, AtkinsonHyperlegibleNext_700Bold } from '@expo-google-fonts/atkinson-hyperlegible-next';
import { SesionProvider } from '../src/controllers/auth/SesionContext';
import { PersistenciaProvider } from '../src/controllers/persistencia/PersistenciaProvider';
import { SincronizacionProvider } from '../src/controllers/sync/SincronizacionContext';
import { RecibidosProvider } from '../src/controllers/archivos/RecibidosContext';
import { RecordatoriosProvider } from '../src/controllers/recordatorios/RecordatoriosContext';

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
    // La cache persistida envuelve a todo: la sesion se rehidrata desde ella.
    <PersistenciaProvider>
      <SesionProvider>
        {/* La cola de salida vive por encima de las rutas: no pertenece a ninguna pantalla. */}
        <SincronizacionProvider>
          {/* Archivos compartidos desde otras apps: por encima de las rutas, para no perderlos en el arranque. */}
          <RecibidosProvider>
            {/* Recordatorios locales y la notificación que abrió la app: también por encima de las rutas. */}
            <RecordatoriosProvider>
              <Slot />
            </RecordatoriosProvider>
          </RecibidosProvider>
        </SincronizacionProvider>
      </SesionProvider>
    </PersistenciaProvider>
  );
}
