import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Boton } from '../../components/shared/Boton';
import { Aviso } from '../../components/shared/Aviso';
import { useSesion } from '../../controllers/auth/useSesion';
import { anchos, colores, espaciado, radios, tipografia } from '../../theme';

export function PerfilView() {
  const { usuario, cerrarSesion } = useSesion();

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <View style={styles.contenedor}>
        <Text style={styles.titulo}>Mi Perfil</Text>
        
        <View style={styles.tarjeta}>
          <Text style={styles.label}>Nombre</Text>
          <Text style={styles.valor}>{usuario?.nombre}</Text>
          
          <Text style={styles.label}>Correo electrónico</Text>
          <Text style={styles.valor}>{usuario?.email}</Text>
        </View>

        <View style={styles.legalNotice}>
          <Aviso 
            tipo="info" 
            mensaje="Recordá que el sistema es una herramienta de apoyo y no sustituye el criterio profesional de un abogado." 
          />
        </View>

        <View style={styles.acciones}>
          <Boton 
            titulo="Cerrar sesión" 
            onPress={cerrarSesion} 
            variante="secundario" 
          />
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    backgroundColor: colores.papel,
  },
  contenedor: {
    padding: espaciado.xl,
    maxWidth: anchos.panel,
    width: '100%',
    alignSelf: 'center',
    flex: 1,
  },
  titulo: {
    fontFamily: tipografia.familias.titulo,
    fontSize: tipografia.escala.titulo,
    color: colores.tinta,
    marginBottom: espaciado.l,
  },
  tarjeta: {
    backgroundColor: colores.superficie,
    padding: espaciado.l,
    borderWidth: 1,
    borderColor: colores.linea,
    borderRadius: radios.m,
    marginBottom: espaciado.xl,
  },
  label: {
    fontFamily: tipografia.familias.cuerpoFuerte,
    fontSize: tipografia.escala.nota,
    color: colores.tintaSuave,
    marginBottom: espaciado.xs,
  },
  valor: {
    fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.escala.cuerpo,
    color: colores.tinta,
    marginBottom: espaciado.m,
  },
  legalNotice: {
    marginBottom: espaciado.xl,
  },
  acciones: {
    marginTop: 'auto',
  },
});
