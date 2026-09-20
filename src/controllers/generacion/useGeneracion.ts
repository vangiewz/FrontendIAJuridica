import { useEffect, useState } from 'react';
import { InterpretacionResponse, Plantilla } from '../../models/generacion';
import {
  generarDocumento, interpretarPedido, listarPlantillas,
} from '../../services/generacion';

/**
 * El formulario y la interpretacion del texto libre. El borrador resultante no se
 * guarda aca: se devuelve su id y la pantalla navega a su ruta, para que tenga URL
 * propia, se pueda recargar y el boton Atras funcione como en el resto de la aplicacion.
 */
export function useGeneracion() {
  const [plantillas, setPlantillas] = useState<Plantilla[]>([]);
  const [cargando, setCargando] = useState(false);
  const [interpretando, setInterpretando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listarPlantillas()
      .then(setPlantillas)
      .catch((e: any) => setError(e.mensaje || 'No se pudieron cargar las plantillas'));
  }, []);

  /**
   * Interpreta una frase. `tipo` y `datos` se mandan cuando ya hay un formulario
   * empezado: el texto lo completa en vez de reemplazarlo. Si falla, devuelve null y
   * el formulario manual sigue estando disponible: la IA nunca bloquea al usuario.
   */
  const interpretar = async (
    texto: string,
    tipo: string | null,
    datos: Record<string, string>,
  ): Promise<InterpretacionResponse | null> => {
    const limpio = texto.trim();
    if (limpio.length < 3) {
      setError('Escribí lo que necesitás para poder interpretarlo.');
      return null;
    }
    setInterpretando(true);
    setError(null);
    try {
      return await interpretarPedido(limpio, tipo, datos);
    } catch (e: any) {
      setError(e.mensaje || 'No se pudo interpretar el texto. Podés completar el formulario a mano.');
      return null;
    } finally {
      setInterpretando(false);
    }
  };

  const generar = async (tipo: string, datos: Record<string, string>): Promise<string | null> => {
    setCargando(true);
    setError(null);
    try {
      return (await generarDocumento(tipo, datos)).id;
    } catch (e: any) {
      setError(e.mensaje || 'No se pudo generar el borrador');
      return null;
    } finally {
      setCargando(false);
    }
  };

  return { plantillas, cargando, interpretando, error, interpretar, generar, setError };
}
