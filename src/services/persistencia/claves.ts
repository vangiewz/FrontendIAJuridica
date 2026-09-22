export const claves = {
  historial: () => ['consultas', 'historial'] as const,
  consulta: (id: string) => ['consultas', 'detalle', id] as const,
  articulo: (codigo: string, numero: number) => ['normativa', 'articulo', codigo, numero] as const,
  indice: (codigo: string) => ['normativa', 'indice', codigo] as const,
};
