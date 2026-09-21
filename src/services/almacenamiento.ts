import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { Tokens, Usuario } from '../models/auth';

const TOKEN_KEY = 'auth_tokens';
const USUARIO_KEY = 'auth_usuario';

export async function guardarSesion(tokens: Tokens): Promise<void> {
  const data = JSON.stringify(tokens);
  if (Platform.OS === 'web') {
    localStorage.setItem(TOKEN_KEY, data);
  } else {
    await SecureStore.setItemAsync(TOKEN_KEY, data);
  }
}

export async function leerSesion(): Promise<Tokens | null> {
  let data: string | null = null;
  if (Platform.OS === 'web') {
    data = localStorage.getItem(TOKEN_KEY);
  } else {
    data = await SecureStore.getItemAsync(TOKEN_KEY);
  }
  return data ? JSON.parse(data) : null;
}

export async function borrarSesion(): Promise<void> {
  if (Platform.OS === 'web') {
    localStorage.removeItem(TOKEN_KEY);
  } else {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  }
}

export async function guardarUsuario(usuario: Usuario): Promise<void> {
  const data = JSON.stringify(usuario);
  if (Platform.OS === 'web') {
    localStorage.setItem(USUARIO_KEY, data);
  } else {
    await SecureStore.setItemAsync(USUARIO_KEY, data);
  }
}

export async function leerUsuario(): Promise<Usuario | null> {
  let data: string | null = null;
  if (Platform.OS === 'web') {
    data = localStorage.getItem(USUARIO_KEY);
  } else {
    data = await SecureStore.getItemAsync(USUARIO_KEY);
  }
  return data ? JSON.parse(data) : null;
}

export async function borrarUsuario(): Promise<void> {
  if (Platform.OS === 'web') {
    localStorage.removeItem(USUARIO_KEY);
  } else {
    await SecureStore.deleteItemAsync(USUARIO_KEY);
  }
}
