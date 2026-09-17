import React from 'react';
import { Tabs } from 'expo-router';
import { colores, tipografia } from '../../src/theme';

export default function AppLayout() {
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
        name="historial" 
        options={{ title: 'Mis Consultas', tabBarLabel: 'Historial' }} 
      />
      <Tabs.Screen 
        name="perfil" 
        options={{ title: 'Mi Perfil', tabBarLabel: 'Perfil' }} 
      />
    </Tabs>
  );
}
