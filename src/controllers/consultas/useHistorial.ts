import { useState } from 'react';
import { ItemHistorial } from '../../models/consultas';
import { listarHistorial } from '../../services/consultas';

export function useHistorial() {
  const [historial, setHistorial] = useState<ItemHistorial[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargar = async () => {
    setCargando(true);
    setError(null);
    try {
      const data = await listarHistorial();
      setHistorial(data);
    } catch (e: any) {
      setError(e.mensaje || 'Error al cargar el historial');
    } finally {
      setCargando(false);
    }
  };

  return { historial, cargando, error, cargar };
}
