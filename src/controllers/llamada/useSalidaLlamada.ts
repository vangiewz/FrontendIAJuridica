import { MutableRefObject, useRef, useState } from 'react';
import { DocumentoGenerado } from '../../models/generacion';
import { ReporteResultado } from '../../models/reportes';
import { exportarBorrador } from '../../services/generacion';
import { exportarReporte } from '../../services/reportes';
import {
  ArchivoSalida, compartirArchivo, guardarEnCache, guardarEnDispositivo, sigueEnCache,
} from '../../services/archivos/salidaMovil';
import { conPantallaDelSistema as enPantallaDelSistema } from './pantallaDelSistema';
import { FormatoSalida } from '../../services/archivos/tiposArchivo';
import { ContenidoPanel } from '../../models/llamada';
import { PanelLlamada } from './usePanelLlamada';

/**
 * SALIDA de archivos desde la llamada: guardar en el teléfono y compartir.
 *
 * No hay un generador nuevo: el archivo es el que ya exporta el backend (documento generado
 * en PDF/Word con `exportarBorrador`; reporte en PDF/Word/Excel/PowerPoint con
 * `exportarReporte`), el mismo que baja la versión web. Se guarda en la caché privada, y desde
 * ahí se comparte (share sheet de Android) o se guarda donde el usuario elija.
 *
 * Abrir el share sheet o el selector de carpeta NO es abandonar la llamada: mientras están a
 * la vista se marca «pantalla del sistema abierta a propósito» (para que la app en segundo
 * plano no corte la voz) y al volver se reanuda la escucha si el asistente no está hablando.
 */

export type ObjetoSalida = 'generado' | 'reporte';
export type AccionSalida = 'guardar' | 'compartir';

export interface EntradasSalida {
  panel: PanelLlamada;
  generado: () => DocumentoGenerado | null;
  reporte: () => ReporteResultado | null;
  hablar: (etiqueta: string, texto: string) => Promise<void>;
  seleccionandoArchivo: MutableRefObject<boolean>;
  pausarEscucha: () => void;
  reanudarEscucha: () => void;
}

export interface EstadoSalida {
  objeto: ObjetoSalida;
  accion: AccionSalida;
  formato: FormatoSalida;
}

const ETIQUETA_OBJETO: Record<ObjetoSalida, string> = { generado: 'Documento', reporte: 'Reporte' };
const PANEL_DE: Record<ObjetoSalida, ContenidoPanel> = {
  generado: { tipo: 'documento_generado' }, reporte: { tipo: 'reporte' },
};

const mensajeDe = (e: unknown, porDefecto: string) => {
  const m = (e as { mensaje?: string })?.mensaje;
  return typeof m === 'string' && m ? m : porDefecto;
};

export function useSalidaLlamada(e: EntradasSalida) {
  const [preparando, setPreparando] = useState<EstadoSalida | null>(null);
  const [resultado, setResultado] = useState<{ tipo: 'ok' | 'error'; texto: string; objeto: ObjetoSalida } | null>(null);
  const enCurso = useRef(false);
  /** El último archivo bajado: guardar y luego compartir lo mismo no vuelve a descargarlo. */
  const ultimo = useRef<{ clave: string; archivo: ArchivoSalida } | null>(null);

  const claveDe = (objeto: ObjetoSalida, formato: FormatoSalida) => {
    if (objeto === 'generado') return `g:${e.generado()?.id}:${formato}`;
    const r = e.reporte();
    return `r:${JSON.stringify(r?.especificacion)}:${r?.peticion}:${formato}`;
  };

  /** El archivo del backend, ya en la caché privada. */
  const obtener = async (objeto: ObjetoSalida, formato: FormatoSalida): Promise<ArchivoSalida> => {
    const clave = claveDe(objeto, formato);
    if (ultimo.current?.clave === clave && sigueEnCache(ultimo.current.archivo)) return ultimo.current.archivo;
    const descargado = objeto === 'generado'
      ? await exportarBorrador(e.generado()!.id, formato as 'pdf' | 'docx')
      : await exportarReporte(e.reporte()!.especificacion, formato, e.reporte()!.peticion);
    const archivo = await guardarEnCache(descargado, formato);
    ultimo.current = { clave, archivo };
    return archivo;
  };

  const conPantallaDelSistema = <T,>(tarea: () => Promise<T>): Promise<T> => enPantallaDelSistema(e, tarea);

  /** Guardar o compartir. `conVoz`: la orden vino hablando, así que el resultado también se dice. */
  const ejecutar = async (objeto: ObjetoSalida, accion: AccionSalida, formato: FormatoSalida, conVoz = false) => {
    if (enCurso.current) return;
    const existe = objeto === 'generado' ? e.generado() : e.reporte();
    if (!existe) {
      if (conVoz) await e.hablar('sin-archivo', objeto === 'generado'
        ? 'Todavía no generé ningún documento para guardar o compartir.' : 'Todavía no preparé ningún reporte para guardar o compartir.');
      return;
    }
    enCurso.current = true;
    setResultado(null);
    setPreparando({ objeto, accion, formato });
    if (conVoz) e.panel.abrir(PANEL_DE[objeto]);
    try {
      const archivo = await obtener(objeto, formato);
      if (accion === 'compartir') {
        await conPantallaDelSistema(() => compartirArchivo(archivo));
      } else {
        const nombre = await conPantallaDelSistema(() => guardarEnDispositivo(archivo));
        if (nombre) {
          setResultado({ tipo: 'ok', texto: `${ETIQUETA_OBJETO[objeto]} guardado como «${nombre}».`, objeto });
          if (conVoz) void e.hablar('guardado', `${ETIQUETA_OBJETO[objeto]} guardado.`);
        }
        // Cancelar el selector no es un error: no se muestra nada.
      }
    } catch (error) {
      const texto = mensajeDe(error, accion === 'compartir' ? 'No pude compartir el archivo.' : 'No pude guardar el archivo.');
      setResultado({ tipo: 'error', texto, objeto });
      if (conVoz) void e.hablar('salida-error', texto);
    } finally {
      enCurso.current = false;
      setPreparando(null);
    }
  };

  /** Por voz: «compartí este documento», «guardá el reporte»… `auto` toma lo que está a la vista. */
  const porVoz = async (accion: AccionSalida, pedido: ObjetoSalida | 'auto', objetoEnPanel: ObjetoSalida | null) => {
    const objeto: ObjetoSalida = pedido !== 'auto' ? pedido
      : objetoEnPanel ?? (e.generado() ? 'generado' : 'reporte');
    await ejecutar(objeto, accion, 'pdf', true);
  };

  return { preparando, resultado, ejecutar, porVoz, limpiarResultado: () => setResultado(null) };
}

export type SalidaLlamada = ReturnType<typeof useSalidaLlamada>;
