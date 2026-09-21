import { useCallback, useRef, useState } from 'react';

/**
 * Un dato mostrado como estado de React Y como ref. Las operaciones largas (subir, reconocer,
 * generar) siguen corriendo después de varios renders: leen el último valor por la ref y no
 * el que tenía su closure al empezar.
 */
export function useEstado<T>(inicial: T) {
  const [valor, setValor] = useState<T>(inicial);
  const ref = useRef<T>(inicial);
  const fijar = useCallback((nuevo: T) => { ref.current = nuevo; setValor(nuevo); }, []);
  return [valor, fijar, ref] as const;
}
