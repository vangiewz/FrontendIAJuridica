import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { Usuario, Tokens, RegistroPayload } from '../../models/auth';
import { leerSesion, borrarSesion, guardarSesion, leerUsuario, guardarUsuario, borrarUsuario } from '../../services/almacenamiento';
import { peticion, esErrorDeTransporte } from '../../services/api';
import { useRouter, useSegments } from 'expo-router';
import { reanudar } from '../../services/sync/despachador';

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
      router.replace('/(app)/(tabs)/');
    }
  }, [usuario, rootSegment, cargando]);

  const cargarSesion = async () => {
    try {
      const tokens = await leerSesion();
      if (tokens) {
        // Con tiempo máximo: sin él, un servidor inalcanzable en la red local deja la app
        // en blanco hasta que el sistema corta la conexión (minutos en Android).
        const userData = await peticion<Usuario>('/api/v1/auth/yo', { timeoutMs: 12000 });
        await guardarUsuario(userData);
        setUsuario(userData);
      }
    } catch (e) {
      if (esErrorDeTransporte(e)) {
        setUsuario(await leerUsuario());
      } else {
        await borrarSesion();
        await borrarUsuario();
      }
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
    reanudar();
    const userData = await peticion<Usuario>('/api/v1/auth/yo');
    await guardarUsuario(userData);
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
    await borrarUsuario();
    setUsuario(null);
  };

  return (
    <SesionContext.Provider value={{ usuario, cargando, iniciarSesion, registrarse, cerrarSesion }}>
      {children}
    </SesionContext.Provider>
  );
}
