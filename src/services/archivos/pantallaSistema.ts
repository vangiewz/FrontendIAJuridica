import { AppState } from 'react-native';
import { crearLiberador } from './pantallaSistemaPuro';

const VENTANA_MS = 1500;
const MAXIMO_MS = 10 * 60 * 1000;

/**
 * Llama a `alLiberar` cuando la app ya volvió de un diálogo del sistema (ver
 * `pantallaSistemaPuro`). Es la contraparte de marcar «hay una pantalla del sistema abierta a
 * propósito»: quien la marcó llama aquí al terminar su promesa y libera la marca en `alLiberar`.
 */
export function liberarAlVolver(alLiberar: () => void): void {
  let temporizadorVentana: ReturnType<typeof setTimeout> | null = null;
  let temporizadorMaximo: ReturnType<typeof setTimeout> | null = null;
  let suscripcion: { remove: () => void } | null = null;

  const limpiar = () => {
    if (temporizadorVentana) clearTimeout(temporizadorVentana);
    if (temporizadorMaximo) clearTimeout(temporizadorMaximo);
    suscripcion?.remove();
  };
  const liberador = crearLiberador(AppState.currentState, () => { limpiar(); alLiberar(); });

  suscripcion = AppState.addEventListener('change', (estado) => liberador.cambio(estado));
  temporizadorVentana = setTimeout(() => liberador.vencio(), VENTANA_MS);
  temporizadorMaximo = setTimeout(() => liberador.forzar(), MAXIMO_MS);
}
