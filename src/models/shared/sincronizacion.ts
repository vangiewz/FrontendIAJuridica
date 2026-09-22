import { ItemHistorial } from '../consultas';

export type EstadoOperacion = 'pendiente' | 'enviando' | 'fallida';

export interface OperacionPendiente {
  id: string;                 // UUID v4 (expo-crypto randomUUID). Es el client_op_id.
  tipo: 'consulta.iniciar';   // union cerrada; crece con cada dominio que se migre
  payload: unknown;           // ya validado contra el esquema del tipo
  creadaEn: string;           // ISO
  intentos: number;
  proximoIntentoEn: string;   // ISO
  estado: EstadoOperacion;
  ultimoError?: string;       // mensaje para el usuario, no el stack
}

export interface ItemHistorialLocal extends ItemHistorial {
  pendiente?: { estado: EstadoOperacion; intentos: number; mensaje?: string };
}
