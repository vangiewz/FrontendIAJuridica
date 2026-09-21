import { TemaAyuda } from '../../config/capacidadesAsistente';
import { ContextoIntencion } from '../../services/llamada/intencion';
import { ContextoDeAyuda, explicarAyuda } from '../../services/llamada/ayudaAsistente';
import { DISPONIBILIDAD } from '../../services/llamada/disponibilidadAsistente';
import { PanelLlamada } from './usePanelLlamada';

/**
 * La AYUDA de la llamada: «¿qué podés hacer?», «¿cómo genero un contrato?»… Se responde en el
 * teléfono con el catálogo de capacidades (`config/capacidadesAsistente.ts`): sin consulta jurídica,
 * sin servidor y sin gastar nada. La voz dice un resumen corto y el panel muestra todo el detalle.
 *
 * Abrir el panel de ayuda es como abrir cualquier otro panel: no toca el micrófono ni corta la voz
 * (un toque en «¿Qué puedo pedirte?» abre el panel en silencio, para no pisarle la voz al asistente).
 */

export interface EntradasAyuda {
  panel: PanelLlamada;
  hablar: (etiqueta: string, texto: string) => Promise<void>;
  /** Lo que la llamada tiene ahora (documento, comparación, reporte…): la ayuda destaca lo relacionado. */
  contexto: () => ContextoIntencion;
}

/** De lo que la llamada sabe, lo que la ayuda necesita. */
export const contextoDeAyuda = (c: ContextoIntencion): ContextoDeAyuda => ({
  documentoActivo: c.documentoActivo, analisis: c.analisis, comparacion: c.comparacion, generado: c.generado, reporte: c.reporte,
});

export function useAyudaLlamada(e: EntradasAyuda) {
  const mostrar = async (tema: TemaAyuda, conVoz: boolean) => {
    const ayuda = explicarAyuda(tema, contextoDeAyuda(e.contexto()), DISPONIBILIDAD);
    // Si no hay nada que mostrar (la función no existe aquí) solo se dice: un panel vacío no ayuda.
    if (ayuda.capacidades.length > 0) e.panel.abrir({ tipo: 'ayuda', tema: ayuda.tema });
    if (conVoz) await e.hablar('ayuda', ayuda.habla);
  };

  return {
    /** Por voz: abre el panel con el detalle Y dice el resumen. */
    explicarPorVoz: (tema: TemaAyuda) => mostrar(tema, true),
    /** Con un toque: solo abre el panel (no le pisa la voz al asistente). */
    abrir: (tema: TemaAyuda = 'general') => { void mostrar(tema, false); },
  };
}

export type AyudaLlamada = ReturnType<typeof useAyudaLlamada>;
