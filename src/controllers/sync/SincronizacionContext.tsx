import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { AppState } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { OperacionPendiente } from '../../models/shared/sincronizacion';
import { leerCola, reintentarAhora, suscribirCola } from '../../services/sync/cola';
import { sincronizar, estaEnPausa } from '../../services/sync/despachador';
import { SesionContext } from '../auth/SesionContext';

interface SyncContextValue {
  pendientes: OperacionPendiente[];
  sincronizando: boolean;
  pausada: boolean;
  reintentar: (id: string) => Promise<void>;
  sincronizarAhora: () => Promise<void>;
}

export const SincronizacionContext = createContext<SyncContextValue | null>(null);

export function SincronizacionProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [pendientes, setPendientes] = useState<OperacionPendiente[]>([]);
  const [sincronizando, setSincronizando] = useState(false);
  const reentrancyGuard = useRef(false);
  
  const [pausada, setPausada] = useState(estaEnPausa());
  const { usuario } = useContext(SesionContext);

  const refrescarCola = useCallback(async () => {
    const cola = await leerCola();
    setPendientes(cola);
    setSincronizando(cola.some(o => o.estado === 'enviando'));
    setPausada(estaEnPausa());
  }, []);

  const llamarSincronizar = useCallback(async () => {
    if (reentrancyGuard.current) return;
    reentrancyGuard.current = true;
    try {
      await sincronizar(queryClient);
      await refrescarCola();
    } finally {
      reentrancyGuard.current = false;
    }
  }, [queryClient, refrescarCola]);

  const handleReintentar = useCallback(async (id: string) => {
    await reintentarAhora(id);
    // no llamamos a llamarSincronizar aca directamente para no duplicar si la suscripcion ya lo hace
    // aunque la suscripcion lo hara
  }, []);

  useEffect(() => {
    if (usuario) {
      llamarSincronizar();
    }
  }, [usuario, llamarSincronizar]);

  useEffect(() => {
    // Al montar
    refrescarCola();
    llamarSincronizar();

    // AppState a active
    const sub = AppState.addEventListener('change', next => {
      if (next === 'active') {
        refrescarCola();
        llamarSincronizar();
      }
    });

    // Justo despues de encolar (o cualquier cambio en la cola)
    const desuscribir = suscribirCola(() => {
      refrescarCola();
      llamarSincronizar();
    });

    return () => {
      sub.remove();
      desuscribir();
    };
  }, [llamarSincronizar, refrescarCola]);

  const value: SyncContextValue = {
    pendientes,
    sincronizando,
    pausada,
    reintentar: handleReintentar,
    sincronizarAhora: llamarSincronizar
  };

  return (
    <SincronizacionContext.Provider value={value}>
      {children}
    </SincronizacionContext.Provider>
  );
}
