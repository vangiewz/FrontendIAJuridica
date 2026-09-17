import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { Usuario, Tokens, RegistroPayload } from '../../models/auth';
import { leerSesion, borrarSesion, guardarSesion } from '../../services/almacenamiento';
import { peticion } from '../../services/api';
import { useRouter, useSegments } from 'expo-router';

interface SesionContextValue {
  usuario: Usuario | null;
  cargando: boolean;
  iniciarSesion: (email: string, password: string) => Promise<void>;
  registrarse: (datos: RegistroPayload) => Promise<void>;
  cerrarSesion: () => Promise<void>;
}

export const SesionContext = createContext<SesionContextValue>({} as SesionContextValue);

export function SesionProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [cargando, setCargando] = useState(true);
  const rootSegment = useSegments()[0];
  const router = useRouter();

  useEffect(() => {
    cargarSesion();
  }, []);

  useEffect(() => {
    if (cargando) return;

    const inAuthGroup = rootSegment === '(auth)';
    
    if (!usuario && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (usuario && inAuthGroup) {
      router.replace('/(app)/');
    }
  }, [usuario, rootSegment, cargando]);

  const cargarSesion = async () => {
    try {
      const tokens = await leerSesion();
      if (tokens) {
        const userData = await peticion<Usuario>('/api/v1/auth/yo');
        setUsuario(userData);
      }
    } catch (e) {
      await borrarSesion();
    } finally {
      setCargando(false);
    }
  };

  const iniciarSesion = async (email: string, password: string) => {
    const tokens = await peticion<Tokens>('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    
    await guardarSesion(tokens);
    const userData = await peticion<Usuario>('/api/v1/auth/yo');
    setUsuario(userData);
  };

  const registrarse = async (datos: RegistroPayload) => {
    await peticion('/api/v1/auth/registro', {
      method: 'POST',
      body: JSON.stringify(datos)
    });
    await iniciarSesion(datos.email, datos.password);
  };

  const cerrarSesion = async () => {
    await borrarSesion();
    setUsuario(null);
  };

  return (
    <SesionContext.Provider value={{ usuario, cargando, iniciarSesion, registrarse, cerrarSesion }}>
      {children}
    </SesionContext.Provider>
  );
}
