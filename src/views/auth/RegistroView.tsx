import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Link } from 'expo-router';
import { Boton } from '../../components/shared/Boton';
import { CampoTexto } from '../../components/shared/CampoTexto';
import { Aviso } from '../../components/shared/Aviso';
import { useSesion } from '../../controllers/auth/useSesion';
import { anchos, colores, espaciado, tipografia } from '../../theme';

export function RegistroView() {
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  const { registrarse } = useSesion();

  const handleRegistro = async () => {
    if (!nombre || !email || !password) {
      setError('Completá todos los campos');
      return;
    }
    try {
      setCargando(true);
      setError('');
      await registrarse({ nombre, email, password });
    } catch (e) {
      const err = e as { mensaje?: string };
      setError(err.mensaje || 'Error al registrarse');
    } finally {
      setCargando(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <View style={styles.contenedor}>
        <Text style={styles.titulo}>Crear cuenta</Text>
        
        {error ? <Aviso mensaje={error} tipo="error" /> : null}

        <CampoTexto
          label="Nombre completo"
          value={nombre}
          onChangeText={setNombre}
        />

        <CampoTexto
          label="Correo electrónico"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        
        <CampoTexto
          label="Contraseña"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        
        <View style={styles.acciones}>
          <Boton titulo="Registrarse" onPress={handleRegistro} cargando={cargando} />
          
          <Link href="/(auth)/login" style={styles.link}>
            <Text style={styles.linkTexto}>¿Ya tenés cuenta? Iniciá sesión</Text>
          </Link>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    backgroundColor: colores.papel,
    justifyContent: 'center',
  },
  contenedor: {
    padding: espaciado.xl,
    maxWidth: anchos.formulario,
    width: '100%',
    alignSelf: 'center',
  },
  titulo: {
    fontFamily: tipografia.familias.titulo,
    fontSize: tipografia.escala.titulo,
    color: colores.tinta,
    marginBottom: espaciado.xl,
  },
  acciones: {
    marginTop: espaciado.l,
    gap: espaciado.m,
  },
  link: {
    alignSelf: 'center',
    padding: espaciado.m,
  },
  linkTexto: {
    fontFamily: tipografia.familias.cuerpoFuerte,
    fontSize: tipografia.escala.nota,
    color: colores.tintaSuave,
  },
});
