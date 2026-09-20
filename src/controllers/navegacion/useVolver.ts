import { useCallback } from 'react';
import { Href, useRouter } from 'expo-router';

/**
 * "Atras" que respeta el historial real.
 *
 * Si hay una pantalla anterior se vuelve a ella, sea cual sea: es lo que hace que
 * consulta → articulo → Atras devuelva esa consulta, y no una ruta fija.
 * El destino de respaldo solo se usa cuando no hay historial, que es el caso de un
 * deep link o una recarga con F5 directamente sobre la pantalla de detalle. Ahi se
 * reemplaza, no se apila, para no dejar una entrada muerta en el historial del navegador.
 */
export function useVolver(respaldo: Href) {
  const router = useRouter();
  return useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace(respaldo);
    }
  }, [router, respaldo]);
}
