import { useContext } from 'react';
import { SincronizacionContext } from './SincronizacionContext';
import { OperacionPendiente } from '../../models/shared/sincronizacion';

export function usePendientes(): {
  pendientes: OperacionPendiente[];
  sincronizando: boolean;
  pausada: boolean;
  reintentar: (id: string) => Promise<void>;
  sincronizarAhora: () => Promise<void>;
} {
  const context = useContext(SincronizacionContext);
  if (!context) {
    throw new Error('usePendientes debe usarse dentro de SincronizacionProvider');
  }
  return context;
}
