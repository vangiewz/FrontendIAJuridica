import React from 'react';
import { Tabs } from 'expo-router';
import { colores, tipografia } from '../../src/theme';
import { useSesion } from '../../src/controllers/auth/useSesion';
import { esAdministrador } from '../../src/models/auth';

export default function AppLayout() {
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
        options={{ title: 'Nueva Consulta', tabBarLabel: 'Consulta' }}
      />
      <Tabs.Screen
        name="consulta"
        options={{ href: null, title: 'Análisis' }}
      />
      <Tabs.Screen
        name="articulo"
        options={{ href: null, title: 'Artículo' }}
      />
      <Tabs.Screen
        name="documentos"
        options={{ title: 'Analizar documento', tabBarLabel: 'Documentos' }}
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
        name="documento"
        options={{ href: null, title: 'Documento' }}
      />
      <Tabs.Screen
        name="comparacion"
        options={{ href: null, title: 'Comparación' }}
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
