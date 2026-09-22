import { QueryClient } from '@tanstack/react-query';
import { leerCola, marcar, quitar } from './cola';
import { operaciones } from './operaciones';
import { clasificar } from './clasificarError';
import { proximoIntento, TOPE_INTENTOS } from './backoff';
import { almacen } from '../persistencia/almacen';

const LOCK_KEY = 'sync:lease';
let timerBackoff: ReturnType<typeof setTimeout> | null = null;
let estaPausada = false;

export function reanudar(): void {
  estaPausada = false;
}

export function estaEnPausa(): boolean {
  return estaPausada;
}

export async function sincronizar(cliente: QueryClient): Promise<void> {
  if (estaPausada) return;

  if (typeof navigator !== 'undefined' && navigator.locks) {
    await navigator.locks.request(LOCK_KEY, { ifAvailable: true }, async (lock) => {
      if (!lock) return;
      await procesarBucle(cliente);
    });
  } else {
    const lease = await almacen.getItem(LOCK_KEY);
    const ahora = Date.now();
    if (lease) {
      const expires = parseInt(lease, 10);
      if (ahora < expires) return;
    }
    await almacen.setItem(LOCK_KEY, (ahora + 60000).toString());
    try {
      await procesarBucle(cliente);
    } finally {
      await almacen.removeItem(LOCK_KEY);
    }
  }

  programarProximo(cliente);
}

async function procesarBucle(cliente: QueryClient): Promise<void> {
  // Cuantas veces salio elegida cada operacion en ESTE pase. El almacen se traga sus
  // errores a proposito —un disco lleno no puede tumbar la app—, pero entonces `marcar`
  // puede no persistir nada, y la vuelta siguiente vuelve a encontrar la misma operacion.
  // Sin este freno el bucle gira a toda velocidad y congela el hilo de JS: la app queda
  // en gris hasta que Android la mata.
  const vistas = new Map<string, number>();

  while (true) {
    if (estaPausada) break;

    const cola = await leerCola();
    const ahoraIso = new Date().toISOString();
    const op = cola.find(o => o.estado === 'pendiente' && o.proximoIntentoEn <= ahoraIso);

    if (!op) break;

    const veces = (vistas.get(op.id) ?? 0) + 1;
    vistas.set(op.id, veces);
    if (veces > 1) {
      console.warn(`[sync] ${op.id} no avanza: el almacen no esta guardando su estado. Corto el pase.`);
      break;
    }

    await marcar(op.id, { estado: 'enviando' });

    const def = operaciones[op.tipo];
    try {
      def.esquema.parse(op.payload);
      
      const res = await def.enviar(op.payload);
      await quitar(op.id);
      def.alExito(cliente, res, op.id);
    } catch (e: any) {
      if (e.errors && e.errors.length > 0) {
        await marcar(op.id, { estado: 'fallida', ultimoError: e.errors[0].message });
        continue;
      }

      const { desenlace, mensaje } = clasificar(e);
      
      if (desenlace === 'exito') {
        await quitar(op.id);
        def.alExito(cliente, null, op.id);
      } else if (desenlace === 'descartar') {
        await marcar(op.id, { estado: 'fallida', ultimoError: mensaje });
      } else if (desenlace === 'pausar') {
        estaPausada = true;
        await marcar(op.id, { estado: 'pendiente', intentos: op.intentos, ultimoError: mensaje });
        break;
      } else {
        const nuevosIntentos = op.intentos + 1;
        if (nuevosIntentos >= TOPE_INTENTOS) {
          await marcar(op.id, { estado: 'fallida', ultimoError: mensaje });
        } else {
          const prox = new Date(proximoIntento(nuevosIntentos, Date.now(), Math.random())).toISOString();
          await marcar(op.id, { estado: 'pendiente', intentos: nuevosIntentos, proximoIntentoEn: prox, ultimoError: mensaje });
        }
      }
    }
  }
}

export function programarProximo(cliente: QueryClient): void {
  if (timerBackoff) {
    clearTimeout(timerBackoff);
    timerBackoff = null;
  }
  
  if (estaPausada) return;

  leerCola().then(cola => {
    const pendientes = cola.filter(o => o.estado === 'pendiente');
    if (pendientes.length === 0) return;

    let minTime = Infinity;
    for (const op of pendientes) {
      const time = new Date(op.proximoIntentoEn).getTime();
      // Una fecha corrupta daria NaN, y NaN pierde toda comparacion: la operacion quedaria
      // invisible para el temporizador y no se reintentaria nunca.
      if (Number.isFinite(time) && time < minTime) minTime = time;
    }
    if (!Number.isFinite(minTime)) return;

    // Piso de un segundo. Si la fecha ya paso —o el almacen no guardo la nueva—, el delay
    // seria 0 y cada pase agendaria el siguiente al instante: un bucle de temporizadores
    // que congela la app igual que el del `while`.
    const delay = Math.max(1000, minTime - Date.now());
    timerBackoff = setTimeout(() => {
      void sincronizar(cliente);
    }, delay);
  }).catch(() => {});
}

export function cancelarEsperaBackoff(): void {
  if (timerBackoff) {
    clearTimeout(timerBackoff);
    timerBackoff = null;
  }
}
