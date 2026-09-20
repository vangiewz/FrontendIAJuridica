import React from 'react';
import { Stack } from 'expo-router';
import { colores, tipografia } from '../../src/theme';
import { View } from 'react-native';
import { AyudaProvider } from '../../src/controllers/ayuda/AyudaContext';
import { AsistenteAyudaGlobal } from '../../src/components/ayuda/AsistenteAyudaGlobal';

/**
 * Stack sobre las pestañas.
 *
 * Cada pantalla de detalle se apila sobre la que la abrió, así que "Atrás" vuelve a
 * esa pantalla y no a la primera pestaña. Es lo que permite que
 * consulta → artículo → Atrás devuelva la misma consulta, y vale igual para el botón
 * del navegador en web y para el gesto/botón físico en Android.
 *
 * Como el detalle queda montado debajo en la pila, volver no lo reconstruye: no se
 * vuelve a pedir la consulta ni, por tanto, a ejecutar el modelo.
 */
export default function AppLayout() {
  return (
    <AyudaProvider>
    <View style={{ flex: 1 }}>
    <Stack screenOptions={{
      headerStyle: { backgroundColor: colores.superficie },
      headerTintColor: colores.tinta,
      headerTitleStyle: {
        fontFamily: tipografia.familias.titulo,
        color: colores.tinta,
      },
      headerBackTitle: 'Atrás',
    }}>
      {/* Las pestañas traen su propio encabezado; un segundo header sería redundante. */}
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="consulta" options={{ title: 'Análisis de la consulta' }} />
      <Stack.Screen name="articulo" options={{ title: 'Artículo' }} />
      <Stack.Screen name="documento" options={{ title: 'Documento' }} />
      <Stack.Screen name="comparacion" options={{ title: 'Comparación' }} />
      <Stack.Screen name="documento-generado" options={{ title: 'Borrador generado' }} />
    </Stack>
    <AsistenteAyudaGlobal />
    </View>
    </AyudaProvider>
  );
}
