import React from 'react';
import { Tabs } from 'expo-router';
import { colores, tipografia } from '../../../src/theme';
import { useSesion } from '../../../src/controllers/auth/useSesion';
import { esAdministrador } from '../../../src/models/auth';

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
      tabBarStyle: { backgroundColor: colores.superficie, borderTopColor: colores.linea }
    }}>
      <Tabs.Screen
        name="index"
        options={{ title: 'Asistente jurídico', tabBarLabel: 'Asistente', headerShown: false }}
      />
      <Tabs.Screen
        name="documentos"
        options={{ title: 'Analizar documento', tabBarLabel: 'Documentos' }}
      />
      <Tabs.Screen
        name="generar"
        options={{ title: 'Generar borrador', tabBarLabel: 'Generar' }}
      />
      <Tabs.Screen
        name="comparar"
        options={{ title: 'Comparar documentos', tabBarLabel: 'Comparar' }}
      />
      <Tabs.Screen
        name="historial"
        options={{ title: 'Historial', tabBarLabel: 'Historial' }}
      />
      <Tabs.Screen
        name="reportes"
        options={{ title: 'Reportes dinámicos', tabBarLabel: 'Reportes' }}
      />
      <Tabs.Screen
        name="administracion"
        options={{
          href: admin ? undefined : null,
          title: 'Administración de normativa',
          tabBarLabel: 'Administración',
        }}
      />
      <Tabs.Screen
        name="perfil"
        options={{ title: 'Mi Perfil', tabBarLabel: 'Perfil' }}
      />
    </Tabs>
  );
}
