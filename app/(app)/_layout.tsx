import React from 'react';
import { Stack, usePathname, useRouter } from 'expo-router';
import { colores, tipografia } from '../../src/theme';
import { View } from 'react-native';
import { useRecibidos } from '../../src/controllers/archivos/RecibidosContext';
import { useRecordatorios } from '../../src/controllers/recordatorios/RecordatoriosContext';
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
/**
 * Lleva a la llamada un archivo que otra app compartió con esta, o el recordatorio cuya notificación se tocó, sin abrir otra llamada ni
 * apilar pantallas: si ya se está en la llamada, ella misma lo muestra; si no, se abre UNA vez.
 * Solo existe con la sesión iniciada, así que un archivo recibido con la app cerrada espera
 * (guardado en la caché privada) hasta que el usuario inicie sesión y recién entonces se ve.
 */
function LlevarRecibidosALlamada() {
  const { recibidos, fallidos } = useRecibidos();
  const { toque } = useRecordatorios();
  const pathname = usePathname();
  const router = useRouter();
  const yaLlevado = React.useRef('');
  // Un archivo recibido sin avisar, o una notificación de recordatorio tocada: los dos llevan a la llamada.
  const firma = [...recibidos, ...fallidos].filter((x) => !x.avisado).map((x) => x.id).concat(toque ? [toque.clave] : []).join(',');

  React.useEffect(() => {
    if (!firma || pathname.endsWith('/llamada') || yaLlevado.current === firma) return;
    yaLlevado.current = firma;
    router.push('/(app)/llamada');
  }, [firma, pathname, router]);
  return null;
}

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
      {/* Llamada por voz: pantalla completa, sin encabezado ni gesto de cierre accidental. */}
      <Stack.Screen name="llamada"
        options={{ headerShown: false, animation: 'slide_from_bottom', gestureEnabled: false }} />
      <Stack.Screen name="consulta" options={{ title: 'Análisis de la consulta' }} />
      <Stack.Screen name="articulo" options={{ title: 'Artículo' }} />
      <Stack.Screen name="documento" options={{ title: 'Documento' }} />
      <Stack.Screen name="comparacion" options={{ title: 'Comparación' }} />
      <Stack.Screen name="documento-generado" options={{ title: 'Borrador generado' }} />
    </Stack>
    <AsistenteAyudaGlobal />
    <LlevarRecibidosALlamada />
    </View>
    </AyudaProvider>
  );
}
