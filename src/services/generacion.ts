import { peticion, peticionBinaria } from './api';
import {
  DocumentoGenerado, FormatoBorrador, InterpretacionResponse, Plantilla, VersionResumen,
} from '../models/generacion';

const RUTA = '/api/v1/documentos-generados';

export async function listarPlantillas(): Promise<Plantilla[]> {
  return peticion<Plantilla[]>(`${RUTA}/plantillas`);
}

export async function generarDocumento(
  tipo: string,
  datos: Record<string, string>,
): Promise<DocumentoGenerado> {
  return peticion<DocumentoGenerado>(RUTA, {
    method: 'POST',
    body: JSON.stringify({ tipo_documento: tipo, datos }),
  });
}

/**
 * Traduce una frase del usuario a los datos de la plantilla. No genera ni guarda nada:
 * solo deja el formulario listo. Con `datos` el texto completa ese formulario en vez de
 * empezar uno nuevo, que es lo que permite ir agregando informacion de a poco.
 */
export async function interpretarPedido(
  texto: string,
  tipo?: string | null,
  datos?: Record<string, string>,
): Promise<InterpretacionResponse> {
  return peticion<InterpretacionResponse>(`${RUTA}/interpretar`, {
    method: 'POST',
    body: JSON.stringify({ texto, tipo_documento: tipo ?? null, datos: datos ?? {} }),
  });
}

export async function listarGenerados(): Promise<DocumentoGenerado[]> {
  return peticion<DocumentoGenerado[]>(RUTA);
}

export async function obtenerGenerado(id: string): Promise<DocumentoGenerado> {
  return peticion<DocumentoGenerado>(`${RUTA}/${id}`);
}

/**
 * Descarga la version guardada como Word o PDF. El backend exporta el contenido tal
 * como esta: no vuelve a pasar por el modelo, asi que el archivo dice lo mismo que la
 * pantalla.
 */
export async function exportarBorrador(id: string, formato: FormatoBorrador) {
  return peticionBinaria(
    `${RUTA}/${id}/exportar`,
    { params: { formato } },
    `borrador.${formato}`,
  );
}

export async function listarVersiones(id: string): Promise<VersionResumen[]> {
  return peticion<VersionResumen[]>(`${RUTA}/${id}/versiones`);
}

/**
 * Crea una version nueva. `instruccion` deja que el modelo aplique el cambio;
 * `contenido` guarda una edicion manual sin pasar por el modelo. La version
 * anterior no se toca en ninguno de los dos casos.
 */
export async function revisarDocumento(
  id: string,
  cambio: { instruccion?: string; datos?: Record<string, string>; contenido?: string },
): Promise<DocumentoGenerado> {
  return peticion<DocumentoGenerado>(`${RUTA}/${id}/revisiones`, {
    method: 'POST',
    body: JSON.stringify(cambio),
  });
}
