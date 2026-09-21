import { useEffect, useState } from 'react';
import { InterpretacionResponse, Plantilla, ProblemaCampo } from '../../models/generacion';
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
  /** Los campos que el usuario tiene que corregir, con el motivo de cada uno. */
  const [problemas, setProblemas] = useState<ProblemaCampo[]>([]);

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
      const respuesta = await interpretarPedido(limpio, tipo, datos);
      setProblemas(respuesta.problemas ?? []);
      return respuesta;
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
    setProblemas([]);
    try {
      return (await generarDocumento(tipo, datos)).id;
    } catch (e: any) {
      setError(e.mensaje || 'No se pudo generar el borrador');
      // Si el servidor dijo QUÉ campos corregir, se marcan en el formulario.
      setProblemas((e?.detalle as { campos?: ProblemaCampo[] } | undefined)?.campos ?? []);
      return null;
    } finally {
      setCargando(false);
    }
  };

  /** Quita el problema de un campo apenas el usuario lo edita: ya no vale lo que se dijo del valor anterior. */
  const quitarProblema = (clave: string) => setProblemas((previos) => previos.filter((p) => p.clave !== clave));

  return {
    plantillas, cargando, interpretando, error, problemas, interpretar, generar, setError, setProblemas, quitarProblema,
  };
}
