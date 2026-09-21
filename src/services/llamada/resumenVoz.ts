import { Analisis, Comparacion, TipoDocumento } from '../../models/documentos';
import { CampoPendiente, DocumentoGenerado } from '../../models/generacion';
import { ReporteResultado } from '../../models/reportes';

/**
 * Lo que el asistente DICE cuando termina una operación. Funciones puras: cada frase se
 * arma solo con lo que el backend devolvió (conteos, tipo, resumen, diferencias); nada se
 * rellena ni se supone. Si un dato no viene, esa frase no se dice.
 */

const TIPOS_HABLADOS: Record<TipoDocumento, string> = {
  compraventa: 'un contrato de compraventa',
  arrendamiento: 'un contrato de arrendamiento',
  prestamo: 'un contrato de préstamo',
  acuerdo_civil: 'un acuerdo civil',
  otro: 'un documento que no pude identificar como uno de los contratos civiles que reconozco',
};

const TITULOS_GENERADOS: Record<string, string> = {
  compraventa: 'compraventa',
  arrendamiento: 'arrendamiento',
  prestamo: 'préstamo',
};

/** «contrato_prestamo_v2.pdf» se dice «contrato prestamo v2»: sin extensión ni guiones. */
export function nombreHablado(nombreArchivo: string): string {
  return nombreArchivo
    .replace(/\.[A-Za-z0-9]{2,5}$/, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim() || 'el documento';
}

const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;

/** Las primeras oraciones de un texto largo, sin cortar a mitad de una. */
export function primerasOraciones(texto: string, maximoCaracteres = 420): string {
  const limpio = texto.replace(/\s+/g, ' ').trim();
  if (limpio.length <= maximoCaracteres) return limpio;
  const oraciones = limpio.split(/(?<=[.!?])\s+/);
  let salida = '';
  for (const oracion of oraciones) {
    if (salida && (salida + ' ' + oracion).length > maximoCaracteres) break;
    salida = salida ? `${salida} ${oracion}` : oracion;
  }
  return salida.length > maximoCaracteres ? '' : salida;
}

export function resumenAnalisis(nombre: string, analisis: Analisis, escaneadoDe?: number): string {
  const partes: string[] = [escaneadoDe
    ? `Terminé de analizar el documento escaneado, de ${plural(escaneadoDe, 'página', 'páginas')}.`
    : `Ya terminé de analizar ${nombreHablado(nombre)}.`];
  partes.push(`Es ${TIPOS_HABLADOS[analisis.tipo_documento] ?? TIPOS_HABLADOS.otro}.`);

  if (analisis.tipo_documento !== 'otro') {
    const altos = analisis.riesgos.filter((r) => r.severidad === 'alta').length;
    const detalle: string[] = [];
    if (analisis.clausulas.length > 0) detalle.push(plural(analisis.clausulas.length, 'cláusula', 'cláusulas'));
    detalle.push(analisis.riesgos.length > 0
      ? `${plural(analisis.riesgos.length, 'riesgo', 'riesgos')}${altos > 0 ? `, ${altos} de severidad alta` : ''}`
      : 'ningún riesgo con las reglas que aplico');
    partes.push(`Detecté ${detalle.join(' y ')}.`);
    const resumen = analisis.resumen ? primerasOraciones(analisis.resumen) : '';
    if (resumen) partes.push(resumen);
  }
  partes.push('Puedes preguntarme lo que quieras sobre el documento, o pedirme que te muestre el análisis.');
  return partes.join(' ');
}

export function resumenComparacion(c: Comparacion): string {
  const a = nombreHablado(c.nombre_a);
  const b = nombreHablado(c.nombre_b);
  if (c.cantidad_cambios === 0) {
    return `Comparé ${a} con ${b} y no encontré diferencias entre ellos.`;
  }
  const cuenta = (tipo: string) => c.diferencias.filter((d) => d.tipo === tipo).length;
  const desglose = [
    cuenta('modificado') && plural(cuenta('modificado'), 'modificada', 'modificadas'),
    cuenta('agregado') && plural(cuenta('agregado'), 'agregada', 'agregadas'),
    cuenta('eliminado') && plural(cuenta('eliminado'), 'eliminada', 'eliminadas'),
  ].filter(Boolean) as string[];
  const partes = [
    `Comparé ${a} con ${b}. Encontré ${plural(c.cantidad_cambios, 'diferencia', 'diferencias')}` +
      (desglose.length ? `: ${desglose.join(', ')}.` : '.'),
  ];
  // Las dos primeras explicaciones que el propio backend redactó para cada cambio.
  const explicadas = c.diferencias.map((d) => d.explicacion?.trim()).filter(Boolean).slice(0, 2) as string[];
  if (explicadas.length) partes.push(`Por ejemplo: ${explicadas.join(' ')}`);
  partes.push('Te muestro el detalle en pantalla.');
  return partes.join(' ');
}

/** Lo que dice el asistente al terminar de reconocer el texto de un escaneo. */
export function resumenEscaneo(paginas: number, sinTexto: number, fallidas: number): string {
  const partes = [`Terminé de leer ${plural(paginas, 'página', 'páginas')}.`];
  if (sinTexto > 0) partes.push(`${plural(sinTexto, 'página no tiene', 'páginas no tienen')} texto legible.`);
  if (fallidas > 0) partes.push(`No pude leer ${plural(fallidas, 'página', 'páginas')}.`);
  partes.push(sinTexto + fallidas > 0
    ? 'Revisa el texto reconocido y repite las páginas que hagan falta.'
    : 'Puedes revisar el texto reconocido o pedirme que analice el documento.');
  return partes.join(' ');
}

export function nombreTipoGenerado(tipo: string): string {
  return TITULOS_GENERADOS[tipo] ?? tipo;
}

export function resumenGenerado(g: DocumentoGenerado, esRevision: boolean): string {
  const partes = [esRevision
    ? `Listo, apliqué el cambio. Es la versión ${g.version} del documento.`
    : `Ya generé el borrador de ${nombreTipoGenerado(g.tipo_documento)}.`];
  const faltan = g.campos_faltantes.length;
  if (faltan > 0) {
    partes.push(faltan === 1
      ? `Quedó 1 dato pendiente, marcado en el texto: ${g.campos_faltantes[0]}. No lo completo por mi cuenta.`
      : `Quedaron ${faltan} datos pendientes, marcados en el texto: ${g.campos_faltantes.join(', ')}. No los completo por mi cuenta.`);
  }
  partes.push('Puedes leerlo en pantalla o pedirme algún cambio.');
  return partes.join(' ');
}

export function resumenReporte(r: ReporteResultado, descargaDisponible: boolean): string {
  const partes = [`El reporte está listo: ${r.titulo}.`];
  partes.push(r.total === 0
    ? 'No hay datos que cumplan esas condiciones todavía.'
    : `Tiene ${plural(r.total, 'resultado', 'resultados')}.`);
  if (r.exportacion && !descargaDisponible) {
    partes.push('Pediste un archivo, pero la descarga solo está disponible en la versión web.');
  }
  return partes.join(' ');
}

/** La pregunta por un dato que falta: usa la etiqueta de la plantilla, tal cual la declara el backend. */
export function preguntaDeCampo(campo: CampoPendiente, primera: boolean, faltan: number): string {
  const inicio = primera
    ? `Me faltan ${plural(faltan, 'dato obligatorio', 'datos obligatorios')}. Puedes decir «generalo así» para dejar el resto pendiente. Empecemos: `
    : 'Siguiente dato: ';
  return `${inicio}${campo.etiqueta}.`;
}
