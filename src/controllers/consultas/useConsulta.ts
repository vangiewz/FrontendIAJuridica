import { useState } from 'react';
import { Consulta } from '../../models/consultas';
import { crearConsulta, obtenerConsulta } from '../../services/consultas';

export function useConsulta() {
  const [consulta, setConsulta] = useState<Consulta | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const crear = async (texto: string): Promise<string | null> => {
    setCargando(true);
    setError(null);
    try {
      const id = await crearConsulta(texto);
      return id;
    } catch (e: any) {
      setError(e.mensaje || 'Error al crear la consulta');
      return null;
    } finally {
      setCargando(false);
    }
  };

  const cargar = async (id: string): Promise<void> => {
    setCargando(true);
    setError(null);
    try {
      const data = await obtenerConsulta(id);
      setConsulta(data);
    } catch (e: any) {
      setError(e.mensaje || 'Error al cargar la consulta');
    } finally {
      setCargando(false);
    }
  };

  return { consulta, cargando, error, crear, cargar };
}
