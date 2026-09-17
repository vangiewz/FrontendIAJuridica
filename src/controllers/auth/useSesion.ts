import { useContext } from 'react';
import { SesionContext } from './SesionContext';

export function useSesion() {
  const context = useContext(SesionContext);
  if (context === undefined) {
    throw new Error('useSesion debe ser usado dentro de un SesionProvider');
  }
  return context;
}
