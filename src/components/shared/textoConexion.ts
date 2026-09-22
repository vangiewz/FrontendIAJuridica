export type EstadoBarra =
  | { tipo: 'oculta' }
  | { tipo: 'sin-red'; pendientes: number }
  | { tipo: 'enviando'; pendientes: number }
  | { tipo: 'enviado' }
  | { tipo: 'fallo'; pendientes: number }
  | { tipo: 'sesion'; pendientes: number }
  | { tipo: 'actualizacion' };

export function textoConexion(estado: EstadoBarra): { texto: string; accion?: string } {
  switch (estado.tipo) {
    case 'oculta':
      return { texto: '' };
    case 'sin-red':
      if (estado.pendientes === 0) {
        return { texto: 'Sin conexión · seguís viendo lo que ya tenés guardado' };
      }
      if (estado.pendientes === 1) {
        return { texto: 'Sin conexión · 1 consulta se enviará al volver la red' };
      }
      return { texto: `Sin conexión · ${estado.pendientes} consultas se enviarán al volver la red` };
    case 'enviando':
      return { texto: `Enviando ${estado.pendientes}…` };
    case 'enviado':
      return { texto: 'Listo · se envió todo' };
    case 'fallo':
      return { texto: `No se pudo enviar ${estado.pendientes}`, accion: 'Reintentar' };
    case 'sesion':
      return { texto: `Tenés ${estado.pendientes} sin enviar`, accion: 'Iniciar sesión' };
    case 'actualizacion':
      return { texto: 'Hay una versión nueva', accion: 'Actualizar' };
  }
}
