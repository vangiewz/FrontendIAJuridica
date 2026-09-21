import { QueryClient } from '@tanstack/react-query';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
// @ts-ignore: Metro resuelve a .web o .native en runtime
import { almacen } from './almacen';

export const VERSION_CACHE = 'v1';

export const clienteQuery = new QueryClient({
  defaultOptions: {
    queries: {
      networkMode: 'offlineFirst',
      gcTime: 7 * 24 * 60 * 60 * 1000,
      staleTime: 5 * 60 * 1000,
      retry: false,
      refetchOnWindowFocus: true,
    },
  },
});

export const persister = createAsyncStoragePersister({
  storage: almacen,
});
