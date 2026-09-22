import { ZodSchema } from 'zod';
import { QueryClient } from '@tanstack/react-query';
import { OperacionPendiente } from '../../models/shared/sincronizacion';
import { EsquemaConsultaIniciar } from '../../models/consultas/esquemas';
import { iniciarConsulta } from '../consultas';
import { claves } from '../persistencia/claves';

interface DefinicionOperacion {
  esquema: ZodSchema;
  enviar(payload: any): Promise<unknown>;
  alExito(cliente: QueryClient, resultado: any, opId: string): void;
}

import { publicarResultado } from './cola';

export const operaciones: Record<OperacionPendiente['tipo'], DefinicionOperacion> = {
  'consulta.iniciar': {
    esquema: EsquemaConsultaIniciar,
    enviar: async (payload) => {
      return iniciarConsulta(payload.texto, payload.documento_id, payload.client_op_id);
    },
    alExito: (cliente, resultado, opId) => {
      cliente.invalidateQueries({ queryKey: claves.historial() });
      if (resultado && typeof resultado === 'string') {
        publicarResultado(opId, resultado);
      }
    }
  }
};
