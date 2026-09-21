import { useCallback, useState } from 'react';
import { ContenidoPanel, TamanoPanel } from '../../models/llamada';

/**
 * El panel de la llamada: qué muestra, cuánto ocupa y por dónde se volvió.
 *
 * Es SOLO estado de interfaz. No conoce la voz, el micrófono, la consulta ni el sondeo, y
 * nada de lo que hace aquí puede tocarlos: abrir, cerrar, minimizar o cambiar de pestaña
 * son estados independientes de `speaking`. Por eso el panel no recibe ningún callback
 * del controlador de voz ni importa `lectura`.
 *
 * `pila` permite el «atrás» DEL PANEL: abrir un artículo desde las fuentes lo apila, y
 * volver regresa a la respuesta sin cerrar nada. Cuando la pila se vacía, el panel se cierra.
 */
export function usePanelLlamada() {
  const [pila, setPila] = useState<ContenidoPanel[]>([]);
  const [tamano, setTamano] = useState<TamanoPanel>('medio');

  const contenido = pila.length > 0 ? pila[pila.length - 1] : null;

  /** Abre un panel de primer nivel (reemplaza lo que hubiera). */
  const abrir = useCallback((nuevo: ContenidoPanel, tamanoInicial: TamanoPanel = 'medio') => {
    setPila([nuevo]);
    // Abrir algo nuevo lo saca de la barra minimizada: se abre para leerse.
    setTamano((actual) => (actual === 'expandido' && tamanoInicial === 'medio' ? actual : tamanoInicial));
  }, []);

  /** Apila un subnivel (p. ej. un artículo dentro de las fuentes). */
  const apilar = useCallback((nuevo: ContenidoPanel) => {
    setPila((previa) => [...previa, nuevo]);
    setTamano((actual) => (actual === 'minimizado' ? 'medio' : actual));
  }, []);

  /** Cambia lo que muestra el nivel actual sin tocar la pila de abajo. */
  const reemplazar = useCallback((nuevo: ContenidoPanel) => {
    setPila((previa) => (previa.length === 0 ? previa : [...previa.slice(0, -1), nuevo]));
  }, []);

  /** «Atrás» del panel: un nivel; si era el primero, se cierra. Nunca cierra la llamada. */
  const volver = useCallback(() => {
    setPila((previa) => previa.slice(0, -1));
  }, []);

  const cerrar = useCallback(() => setPila([]), []);
  const minimizar = useCallback(() => setTamano('minimizado'), []);
  const restaurar = useCallback(() => setTamano('medio'), []);
  const expandir = useCallback(() => setTamano('expandido'), []);
  /** Un toque en el asa: minimizado → medio → expandido → medio. */
  const alternar = useCallback(() => {
    setTamano((actual) => (actual === 'medio' ? 'expandido' : 'medio'));
  }, []);

  return {
    abierto: pila.length > 0, contenido, nivel: pila.length, tamano,
    abrir, apilar, reemplazar, volver, cerrar, minimizar, restaurar, expandir, alternar,
  };
}

export type PanelLlamada = ReturnType<typeof usePanelLlamada>;
