import { useState, useEffect } from 'react';
import { useConexion } from './useConexion';
import { usePendientes } from '../sync/usePendientes';
import { useActualizacion } from '../pwa/useActualizacion';
import { estaEnPausa } from '../../services/sync/despachador';
import { EstadoBarra } from '../../components/shared/textoConexion';

export function useBarraConexion(): {
  estado: EstadoBarra;
  reintentar: () => Promise<void>;
  actualizar: () => void;
} {
  const { estado: estadoRed } = useConexion() as any;
  const { pendientes, sincronizando, pausada, reintentar: reintentarPendiente } = usePendientes();
  const { hayActualizacion, aplicar } = useActualizacion();
  const [enviadoReciente, setEnviadoReciente] = useState(false);
  const [pendientesAnterior, setPendientesAnterior] = useState(0);

  useEffect(() => {
    const cant = pendientes.length;
    if (cant === 0 && pendientesAnterior > 0 && !sincronizando) {
      setEnviadoReciente(true);
      const timer = setTimeout(() => setEnviadoReciente(false), 2000);
      return () => clearTimeout(timer);
    }
    setPendientesAnterior(cant);
  }, [pendientes.length, pendientesAnterior, sincronizando]);

  let estado: EstadoBarra = { tipo: 'oculta' };

  const cant = pendientes.length;
  const fallidas = pendientes.filter(p => p.estado === 'fallida').length;

  if (fallidas > 0) {
    estado = { tipo: 'fallo', pendientes: fallidas };
  } else if (pausada || estaEnPausa()) {
    estado = { tipo: 'sesion', pendientes: cant };
  } else if (estadoRed === 'sin-red') {
    estado = { tipo: 'sin-red', pendientes: cant };
  } else if (sincronizando || pendientes.some(p => p.estado === 'enviando')) {
    estado = { tipo: 'enviando', pendientes: cant };
  } else if (enviadoReciente) {
    estado = { tipo: 'enviado' };
  } else if (hayActualizacion && estadoRed !== 'sin-red') {
    estado = { tipo: 'actualizacion' };
  }

  const reintentar = async () => {
    if (fallidas > 0) {
      const fallida = pendientes.find(p => p.estado === 'fallida');
      if (fallida) {
        await reintentarPendiente(fallida.id);
      }
    }
  };

  return {
    estado,
    reintentar,
    actualizar: aplicar,
  };
}

