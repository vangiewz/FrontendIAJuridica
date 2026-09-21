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
  while (true) {
    if (estaPausada) break;

    const cola = await leerCola();
    const ahoraIso = new Date().toISOString();
    const op = cola.find(o => o.estado === 'pendiente' && o.proximoIntentoEn <= ahoraIso);
    
    if (!op) break;

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
      if (time < minTime) minTime = time;
    }

    const delay = Math.max(0, minTime - Date.now());
    timerBackoff = setTimeout(() => {
      sincronizar(cliente);
    }, delay);
  }).catch(() => {});
}
