import React from 'react';
import { ColorValue, Platform, useWindowDimensions } from 'react-native';
import { Tabs } from 'expo-router';
import { Icono, NombreIcono } from '../../../src/components/shared/Icono';
import { colores, tipografia } from '../../../src/theme';
import { useSesion } from '../../../src/controllers/auth/useSesion';
import { esAdministrador } from '../../../src/models/auth';

/** Icono de cada pestaña. Sin él, en el celular quedan siete etiquetas de texto apretadas. */
const ICONOS: Record<string, NombreIcono> = {
  index: 'chatbubbles-outline', documentos: 'document-text-outline', generar: 'create-outline',
  comparar: 'git-compare-outline', historial: 'time-outline', reportes: 'bar-chart-outline',
  administracion: 'shield-checkmark-outline', perfil: 'person-outline',
};

/** Etiquetas cortas para la barra inferior de un teléfono (7-8 pestañas en ~360 dp). */
const CORTAS: Record<string, string> = {
  documentos: 'Analizar', administracion: 'Admin',
};

/**
 * Solo las secciones que son pestañas de verdad.
 *
 * Las pantallas de detalle (consulta, artículo, documento, comparación) viven en el
 * Stack de `(app)`, no aquí: un tab navigator tiene `backBehavior: 'firstRoute'`, así
 * que su historial es siempre [primera pestaña, pestaña actual] y "Atrás" desde
 * cualquier detalle caía en el formulario vacío en lugar de la pantalla anterior.
 */
export default function TabsLayout() {
  const { usuario } = useSesion();
  const { width } = useWindowDimensions();
  // Barra compacta en cualquier celular y en ventanas estrechas; la web ancha no cambia.
  const compacto = Platform.OS !== 'web' || width < 600;
  const opcionesPestana = (nombre: string, etiqueta: string) => compacto ? {
    tabBarLabel: CORTAS[nombre] ?? etiqueta,
    tabBarIcon: ({ color }: { color: ColorValue }) => (
      <Icono nombre={ICONOS[nombre]} tamano={22} color={color as string} />),
  } : { tabBarLabel: etiqueta };
  // href: null saca la pestaña de la barra sin desregistrar la ruta. Ocultarla es
  // comodidad: el endpoint de administración exige el rol igual.
  const admin = esAdministrador(usuario);

  return (
    <Tabs screenOptions={{
      headerShown: true,
      headerStyle: { backgroundColor: colores.superficie },
      headerTitleStyle: {
        fontFamily: tipografia.familias.titulo,
        color: colores.tinta
      },
      tabBarActiveTintColor: colores.accion,
      tabBarInactiveTintColor: colores.tintaSuave,
      tabBarStyle: { backgroundColor: colores.superficie, borderTopColor: colores.linea },
      // Con el teclado abierto la barra sobra y le quita altura al campo de texto.
      tabBarHideOnKeyboard: true,
      ...(compacto ? {
        tabBarLabelStyle: { fontSize: 10, fontFamily: tipografia.familias.cuerpo },
        tabBarItemStyle: { paddingHorizontal: 0 },
        tabBarAllowFontScaling: false,
      } : {}),
    }}>
      <Tabs.Screen
        name="index"
        options={{ title: 'Asistente jurídico', ...opcionesPestana('index', 'Asistente'), headerShown: false }}
      />
      <Tabs.Screen
        name="documentos"
        options={{ title: 'Analizar documento', ...opcionesPestana('documentos', 'Documentos') }}
      />
      <Tabs.Screen
        name="generar"
        options={{ title: 'Generar borrador', ...opcionesPestana('generar', 'Generar') }}
      />
      <Tabs.Screen
        name="comparar"
        options={{ title: 'Comparar documentos', ...opcionesPestana('comparar', 'Comparar') }}
      />
      <Tabs.Screen
        name="historial"
        options={{ title: 'Historial', ...opcionesPestana('historial', 'Historial') }}
      />
      <Tabs.Screen
        name="reportes"
        options={{ title: 'Reportes dinámicos', ...opcionesPestana('reportes', 'Reportes') }}
      />
      <Tabs.Screen
        name="administracion"
        options={{
          href: admin ? undefined : null,
          title: 'Administración de normativa',
          ...opcionesPestana('administracion', 'Administración'),
        }}
      />
      <Tabs.Screen
        name="perfil"
        options={{ title: 'Mi Perfil', ...opcionesPestana('perfil', 'Perfil') }}
      />
    </Tabs>
  );
}
