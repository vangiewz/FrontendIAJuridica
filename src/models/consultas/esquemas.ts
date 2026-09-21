import { z } from 'zod';

export const EsquemaConsultaIniciar = z.object({
  texto: z.string().trim().min(3).max(2000),
  documento_id: z.string().uuid().nullable(),
  client_op_id: z.string().uuid(),
});

export type PayloadConsultaIniciar = z.infer<typeof EsquemaConsultaIniciar>;
