import { peticion } from './api';
import {
  CatalogoAyuda, PantallaAyuda, RespuestaAyuda, TipoDocumentoAyuda, TurnoAyuda,
} from '../models/ayuda';

export function obtenerCatalogoAyuda(pantalla: PantallaAyuda, tipo: TipoDocumentoAyuda | null) {
  const query = pantalla === 'generar' && tipo ? `?tipo_documento=${tipo}` : '';
  return peticion<CatalogoAyuda>(`/api/v1/ayuda/pantallas/${pantalla}${query}`);
}

export function preguntarAyuda(datos: {
  pregunta: string;
  pantalla: PantallaAyuda;
  elemento: string | null;
  tipo_documento: TipoDocumentoAyuda | null;
  modo_reporte: 'ia' | 'visual' | null;
  historial: TurnoAyuda[];
}) {
  return peticion<RespuestaAyuda>('/api/v1/ayuda/chat', {
    method: 'POST', body: JSON.stringify(datos),
  });
}
