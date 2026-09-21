import React, { ReactNode, useEffect, useState } from 'react';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { clienteQuery, persister, VERSION_CACHE } from '../../services/persistencia/cliente';

export function PersistenciaProvider({ children }: { children: ReactNode }) {
  const [listo, setListo] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setListo(true);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <PersistQueryClientProvider
      client={clienteQuery}
      persistOptions={{
        persister,
        buster: VERSION_CACHE,
        maxAge: 7 * 24 * 60 * 60 * 1000,
      }}
      onSuccess={() => setListo(true)}
    >
      {listo ? children : null}
    </PersistQueryClientProvider>
  );
}
