/**
 * Cuándo se puede dar por terminado un «diálogo del sistema» que tapa la app a propósito
 * (el share sheet, el selector de carpeta para guardar). Lógica pura: se prueba sola.
 *
 * Para Android la app pasa a «segundo plano» mientras eso está a la vista, y NO es un
 * abandono de la llamada. El problema es el momento: el share sheet devuelve su resultado
 * en cuanto el usuario elige un destino, y ENTONCES se abre WhatsApp o Gmail (la app pasa a
 * segundo plano un instante después). Por eso no basta con esperar a la promesa:
 *
 *   - si al terminar la promesa la app sigue activa, se espera una ventana corta a ver si
 *     sale a otra app; si sale, se libera al VOLVER; si no sale, se libera al vencer la ventana;
 *   - si ya estaba fuera, se libera al volver.
 */
export type FaseLiberador = 'esperando_salida' | 'fuera' | 'liberado';

export function crearLiberador(estadoInicial: string, alLiberar: () => void) {
  let fase: FaseLiberador = estadoInicial === 'active' ? 'esperando_salida' : 'fuera';
  const liberar = () => {
    if (fase === 'liberado') return;
    fase = 'liberado';
    alLiberar();
  };
  return {
    /** Cambió el estado de la app (`AppState`). */
    cambio(estado: string) {
      if (fase === 'liberado') return;
      if (estado !== 'active') fase = 'fuera';
      else if (fase === 'fuera') liberar();
    },
    /** Venció la ventana de espera sin que la app saliera. */
    vencio() {
      if (fase === 'esperando_salida') liberar();
    },
    /** Tope de seguridad: no dejar la app «en pausa» para siempre. */
    forzar: liberar,
    fase: (): FaseLiberador => fase,
  };
}
