import { OperacionPendiente } from '../../models/shared/sincronizacion';
import { almacen } from '../persistencia/almacen';
import { operaciones } from './operaciones';
import { randomUUID } from 'expo-crypto';

const CLAVE_COLA = 'sync:cola:v1';

type ColaListener = () => void;
const listeners = new Set<ColaListener>();

export function suscribirCola(listener: ColaListener) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

function notificar() {
  listeners.forEach(l => l());
}

export async function leerCola(): Promise<OperacionPendiente[]> {
  const json = await almacen.getItem(CLAVE_COLA);
  if (!json) return [];
  try {
    return JSON.parse(json) as OperacionPendiente[];
  } catch {
    return [];
  }
}

async function guardarCola(cola: OperacionPendiente[]): Promise<void> {
  await almacen.setItem(CLAVE_COLA, JSON.stringify(cola));
  notificar();
}

export async function encolar(tipo: OperacionPendiente['tipo'], payload: unknown): Promise<OperacionPendiente> {
  const def = operaciones[tipo];
  if (!def) throw new Error(`Operación no soportada: ${tipo}`);

  let validPayload;
  try {
    validPayload = def.esquema.parse(payload);
  } catch (e: any) {
    if (e.errors && e.errors.length > 0) {
      throw new Error(e.errors[0].message);
    }
    throw e;
  }

  const ahora = new Date().toISOString();
  const op: OperacionPendiente = {
    id: (validPayload as any).client_op_id || randomUUID(),
    tipo,
    payload: validPayload,
    creadaEn: ahora,
    intentos: 0,
    proximoIntentoEn: ahora,
    estado: 'pendiente',
  };

  const cola = await leerCola();
  cola.push(op);
  cola.sort((a, b) => new Date(a.creadaEn).getTime() - new Date(b.creadaEn).getTime());
  await guardarCola(cola);

  return op;
}

export async function marcar(id: string, cambios: Partial<OperacionPendiente>): Promise<void> {
  const cola = await leerCola();
  const index = cola.findIndex(o => o.id === id);
  if (index !== -1) {
    cola[index] = { ...cola[index], ...cambios };
    await guardarCola(cola);
  }
}

export async function quitar(id: string): Promise<void> {
  const cola = await leerCola();
  const nueva = cola.filter(o => o.id !== id);
  if (nueva.length !== cola.length) {
    await guardarCola(nueva);
  }
}

export async function reintentarAhora(id: string): Promise<void> {
  await marcar(id, { estado: 'pendiente', intentos: 0, proximoIntentoEn: new Date().toISOString(), ultimoError: undefined });
}

const eventosResultados = new Map<string, (idReal: string) => void>();

export function publicarResultado(opId: string, idReal: string): void {
  const resolutor = eventosResultados.get(opId);
  if (resolutor) {
    resolutor(idReal);
    eventosResultados.delete(opId);
  }
}

export function esperarResultado(opId: string, tiempoMs: number): Promise<string | null> {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      eventosResultados.delete(opId);
      resolve(null);
    }, tiempoMs);

    eventosResultados.set(opId, (idReal: string) => {
      clearTimeout(timeout);
      resolve(idReal);
    });
  });
}
