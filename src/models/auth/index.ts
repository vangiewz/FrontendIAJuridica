export interface Usuario {
  id: string;
  email: string;
  nombre: string;
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
