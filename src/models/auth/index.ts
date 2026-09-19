/** Roles de RolUsuario en el backend. El registro público siempre crea 'ciudadano'. */
export type RolUsuario = 'ciudadano' | 'profesional' | 'administrador';

export interface Usuario {
  id: string;
  email: string;
  nombre: string;
  rol: RolUsuario;
}

/**
 * Si el usuario ve la sección de administración.
 *
 * Es solo para no mostrar una pantalla que no puede usar: quien decide de verdad
 * es el backend, que exige el rol en cada petición.
 */
export function esAdministrador(usuario: Usuario | null): boolean {
  return usuario?.rol === 'administrador';
}

export interface Tokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface RegistroPayload {
  email: string;
  password: string;
  nombre: string;
}
