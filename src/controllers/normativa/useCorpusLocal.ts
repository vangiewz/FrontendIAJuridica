import { useState, useEffect, useCallback, useRef } from 'react';
import { sincronizarCorpus, CODIGO_CIVIL } from '../../services/corpus/descarga';

export function useCorpusLocal() {
  const [estado, setEstado] = useState<'desconocido' | 'descargando' | 'completo' | 'sin-red' | 'error'>('desconocido');
  const [guardados, setGuardados] = useState(0);
  const [total, setTotal] = useState(0);
  const descargandoRef = useRef(false);

  const arrancar = useCallback(async () => {
    if (descargandoRef.current) return;
    descargandoRef.current = true;
    setEstado(prev => prev === 'completo' ? 'completo' : 'descargando');
    
    try {
      const res = await sincronizarCorpus(CODIGO_CIVIL, (g, t) => {
        setGuardados(g);
        setTotal(t);
      });
      
      if (res === 'ya-estaba' || res === 'descargado') {
        setEstado('completo');
      } else if (res === 'sin-red') {
        setEstado('sin-red');
      }
    } catch (e) {
      setEstado('error');
    } finally {
      descargandoRef.current = false;
    }
  }, []);

  useEffect(() => {
    arrancar();
  }, [arrancar]);

  const reintentar = useCallback(async () => {
    await arrancar();
  }, [arrancar]);

  return { estado, guardados, total, reintentar };
}
