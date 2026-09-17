import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { Tokens } from '../models/auth';

const TOKEN_KEY = 'auth_tokens';

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
