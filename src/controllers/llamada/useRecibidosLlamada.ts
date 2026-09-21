import { useEffect } from 'react';
import { ArchivoSeleccionado } from '../../models/documentos';
import { DestinoArchivo, ExtraSubida } from '../../models/llamada';
import { useRecibidos } from '../archivos/RecibidosContext';
import { PanelLlamada } from './usePanelLlamada';

/**
 * Los ARCHIVOS RECIBIDOS de otras apps, dentro de la llamada.
 *
 * Recibir NO analiza: al llegar un archivo se abre el panel «Archivo recibido» y el asistente
 * lo dice UNA sola vez. El usuario decide. Si pulsa «Analizar», el archivo entra por el MISMO
 * `subirArchivo` que uno elegido en «Archivos» o escaneado con la cámara: `subirDocumento`,
 * `analizarDocumento`, documento activo y voz del resultado.
 *
 * Que llegue un archivo NO corta al asistente: se abre el panel (visual) y el aviso hablado
 * espera a que termine lo que estaba diciendo (`hablar`).
 */

export interface EntradasRecibidos {
  panel: PanelLlamada;
  hablar: (etiqueta: string, texto: string) => Promise<void>;
  subirArchivo: (para: DestinoArchivo, archivo: ArchivoSeleccionado, extra?: ExtraSubida) => Promise<void>;
  ocupado: { current: boolean };
  saludado: { current: boolean };
  anuncioInicial: { current: string | null };
}

export function useRecibidosLlamada(e: EntradasRecibidos) {
  const { recibidos, fallidos, descartar, marcarAvisado } = useRecibidos();

  // Avisar UNA vez por archivo (o por tanda, si llegaron varios juntos).
  useEffect(() => {
    const nuevos = [...recibidos, ...fallidos].filter((x) => !x.avisado);
    if (nuevos.length === 0) return;
    nuevos.forEach((x) => marcarAvisado(x.id));
    e.panel.abrir({ tipo: 'recibido' });
    const soloFallos = nuevos.every((x) => 'mensaje' in x);
    const texto = soloFallos
      ? (nuevos[0] as { mensaje: string }).mensaje
      : nuevos.length === 1
        ? 'Recibí un documento. ¿Querés que lo analice?'
        : `Recibí ${nuevos.length} archivos. ¿Cuál querés que analice?`;
    // Antes del saludo, el aviso ocupa su lugar; después, se dice en cuanto el asistente calle.
    if (!e.saludado.current) e.anuncioInicial.current = texto;
    else void e.hablar('recibido', texto);
    // Solo se reacciona a lo que llega: los helpers cambian de identidad en cada render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recibidos, fallidos]);

  const analizar = async (id: string) => {
    const r = recibidos.find((x) => x.id === id);
    if (!r || e.ocupado.current) return;
    const archivo: ArchivoSeleccionado = { nombre: r.nombre, extension: r.extension, tamano: r.tamano, mimeType: r.mime, uri: r.uri };
    // Solo si TODO salió bien se borra la copia temporal; si falla se puede reintentar.
    await e.subirArchivo('documento', archivo, { alExito: () => descartar(id) });
  };

  /** Por voz («analizalo»): con un solo archivo lo analiza; con varios, hay que elegir en el panel. */
  const analizarPorVoz = async (): Promise<'analizando' | 'varios' | 'ninguno'> => {
    if (recibidos.length === 0) return 'ninguno';
    if (recibidos.length > 1) return 'varios';
    await analizar(recibidos[0].id);
    return 'analizando';
  };

  const descartarTodo = () => {
    [...recibidos, ...fallidos].forEach((x) => descartar(x.id));
    if (e.panel.contenido?.tipo === 'recibido') e.panel.cerrar();
  };

  return { recibidos, fallidos, analizar, analizarPorVoz, descartar, descartarTodo };
}

export type RecibidosLlamada = ReturnType<typeof useRecibidosLlamada>;
