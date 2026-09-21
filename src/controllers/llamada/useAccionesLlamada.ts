import { MutableRefObject, useRef, useState } from 'react';
import {
  Analisis, ArchivoSeleccionado, Comparacion, ItemDocumento,
} from '../../models/documentos';
import { DocumentoGenerado, FormatoBorrador } from '../../models/generacion';
import { FormatoExportacion, ReporteResultado } from '../../models/reportes';
import {
  BorradorEnCurso, DestinoArchivo, ExtraSubida, FichaDocumento, Operacion, OpcionesOperacion,
  TEXTO_OPERACION, TipoOperacion,
} from '../../models/llamada';
import {
  analizarDocumento, compararDocumentos, subirDocumento,
} from '../../services/documentos';
import {
  exportarBorrador, generarDocumento, interpretarPedido, revisarDocumento,
} from '../../services/generacion';
import { exportarReporte, generarReporte } from '../../services/reportes';
import { descargaDisponible, guardarArchivo } from '../../services/descargas';
import { seleccionarDocumento } from '../../services/selectorArchivos';
import { obtenerEstadoLectura, suscribirLectura } from '../../services/voz/lectura';
import {
  aPlano, ContextoIntencion, IntencionLlamada, ObjetoMostrable,
} from '../../services/llamada/intencion';
import {
  nombreHablado, nombreTipoGenerado, preguntaDeCampo, resumenAnalisis, resumenComparacion,
  resumenGenerado, resumenReporte,
} from '../../services/llamada/resumenVoz';
import { mensajeDeError as mensajeDeCarga, validar } from '../documentos/useCargaDocumento';
import { mensajeDeError as mensajeDeComparacion } from '../documentos/useComparacion';
import { DocumentoActivo } from '../consultas/useAsistente';
import { PanelLlamada } from './usePanelLlamada';
import { useEstado } from './useEstado';
import { useEscanerLlamada } from './useEscanerLlamada';
import { useRecibidosLlamada } from './useRecibidosLlamada';
import { useSalidaLlamada } from './useSalidaLlamada';
import { useRecordatoriosLlamada } from './useRecordatoriosLlamada';
import { useAyudaLlamada } from './useAyudaLlamada';

/**
 * El ORQUESTADOR de la llamada: lleva las órdenes de voz que no son una consulta jurídica
 * (subir, analizar, comparar, generar, reportes) hacia los módulos que YA existen.
 *
 * No hay otro subir, otro análisis, otro comparador, otro generador ni otro motor de
 * reportes: cada paso llama al mismo servicio que usa la pantalla normal de ese módulo
 * (`subirDocumento`, `analizarDocumento`, `compararDocumentos`, `interpretarPedido`,
 * `generarDocumento`, `revisarDocumento`, `generarReporte`) y reutiliza sus traducciones de
 * error. Aquí solo se decide el ORDEN, se guarda el resultado de la sesión y se le dice al
 * usuario, por voz, lo que realmente devolvió el backend.
 *
 * El resultado de cada módulo vive aquí mientras la llamada está abierta: abrir, cerrar o
 * cambiar el panel no lo destruye. Y nada de esto detiene la voz: la única causa para
 * callar al asistente sigue siendo interrumpir, finalizar o un error de la voz misma.
 */

const MENSAJE_TIPO =
  '¿Qué documento quieres generar: compraventa, arrendamiento o préstamo? Solo puedo redactar esos tres tipos.';
const RECORTE_INSTRUCCION = 500; // máximo que acepta el backend en una revisión

const mensajeDe = (e: any, porDefecto: string) => (typeof e?.mensaje === 'string' && e.mensaje) || porDefecto;

/** Espera a que el asistente termine lo que esté diciendo: un resultado no le pisa la voz. */
function esperarSilencio(): Promise<void> {
  return new Promise((resolver) => {
    if (obtenerEstadoLectura().id === null) { resolver(); return; }
    const baja = suscribirLectura(() => {
      if (obtenerEstadoLectura().id === null) { baja(); resolver(); }
    });
  });
}

export interface EntradasAcciones {
  documento: DocumentoActivo | null;
  elegirDocumento: (documento: DocumentoActivo | null) => void;
  panel: PanelLlamada;
  /** Hay una operación en curso: el micrófono no debe abrirse (lo lee `escuchar`). */
  ocupado: MutableRefObject<boolean>;
  /** La llamada sigue abierta. */
  activa: () => boolean;
  /** Dice el texto con la voz del teléfono y, al terminar, vuelve a escuchar. */
  decir: (id: string, texto: string) => void;
  /** Marca un fallo de operación: avatar en error; la llamada NO se cierra. */
  fallar: (mensaje: string) => void;
  /** El selector de archivos del sistema está abierto: la app «pasa a segundo plano» sin que sea un abandono. */
  seleccionandoArchivo: MutableRefObject<boolean>;
  /** Cierra el micrófono antes de abrir el selector del sistema. */
  antesDelSelector: () => void;
  /** Reanuda la escucha si corresponde (el usuario canceló el selector). */
  despuesDelSelector: () => void;
  /** La cámara del escáner está abierta: la ESCUCHA se pausa (la voz del asistente no). */
  escanerAbierto: MutableRefObject<boolean>;
  /** La llamada ya dijo su saludo. */
  saludado: MutableRefObject<boolean>;
  /** Un aviso que llegó antes del saludo: el saludo lo dice en su lugar. */
  anuncioInicial: MutableRefObject<string | null>;
}

export function useAccionesLlamada(e: EntradasAcciones) {
  const [ficha, fijarFicha, fichaRef] = useEstado<FichaDocumento | null>(null);
  const [analisis, fijarAnalisis, analisisRef] = useEstado<Analisis | null>(null);
  const [seleccion, fijarSeleccion, seleccionRef] =
    useEstado<{ a: FichaDocumento | null; b: FichaDocumento | null } | null>(null);
  const [comparacion, fijarComparacion, comparacionRef] = useEstado<Comparacion | null>(null);
  const [borrador, fijarBorrador, borradorRef] = useEstado<BorradorEnCurso | null>(null);
  const [generado, fijarGenerado, generadoRef] = useEstado<DocumentoGenerado | null>(null);
  const [reporte, fijarReporte, reporteRef] = useEstado<ReporteResultado | null>(null);
  const [operacion, setOperacion] = useState<Operacion | null>(null);
  const [exportando, setExportando] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const reintento = useRef<(() => void) | null>(null);

  const { panel, ocupado, activa } = e;

  // ── Piezas comunes ──────────────────────────────────────────────────────────────────
  const hablar = async (etiqueta: string, texto: string) => {
    await esperarSilencio();
    if (!activa()) return;
    e.decir(`llamada-${etiqueta}-${Date.now()}`, texto);
  };

  const etapa = (tipo: TipoOperacion) =>
    setOperacion({ tipo, texto: TEXTO_OPERACION[tipo], iniciadoEn: Date.now() });
  /** Cambia solo el texto de la operación en curso, conservando su reloj (progreso REAL, p. ej. página 2 de 4). */
  const avanzarOperacion = (texto: string) =>
    setOperacion((actual) => (actual ? { ...actual, texto } : actual));

  /** El documento sobre el que se trabaja: el de esta sesión o el que trajo el chat. */
  const fichaActiva = (): FichaDocumento | null => {
    if (fichaRef.current) return fichaRef.current;
    return e.documento
      ? { id: e.documento.id, nombre: e.documento.nombre_archivo, tipo: null, estado: 'completado' }
      : null;
  };

  const activar = (nueva: FichaDocumento) => {
    fijarFicha(nueva);
    if (analisisRef.current && analisisRef.current.documento_id !== nueva.id) fijarAnalisis(null);
    e.elegirDocumento({ id: nueva.id, nombre_archivo: nueva.nombre });
  };

  /**
   * Corre una operación larga: el avatar «piensa», el micrófono no se abre y, si falla,
   * NO se cierra la llamada: se dice, se muestra con «Reintentar» y se vuelve a escuchar.
   */
  const mostrarFallo = (mensaje: string, alReintentar: () => void) => {
    reintento.current = alReintentar;
    panel.abrir({ tipo: 'error', mensaje, puedeReintentar: true });
    e.fallar(mensaje);
  };

  const correr = async (tipo: TipoOperacion, tarea: () => Promise<void>, opciones: OpcionesOperacion) => {
    if (ocupado.current) return;
    ocupado.current = true;
    etapa(tipo);
    setAviso(null);
    try {
      await tarea();
    } catch (error) {
      const detalle = (opciones.mapear ?? ((x) => mensajeDe(x, '')))(error);
      mostrarFallo(`${opciones.prefijoError}${detalle ? ` ${detalle}` : ''}`, opciones.alReintentar);
    } finally {
      ocupado.current = false;
      if (activa()) setOperacion(null);
    }
  };

  const reintentarOperacion = () => {
    const accion = reintento.current;
    reintento.current = null;
    if (accion) accion();
  };

  // ── Documento activo ────────────────────────────────────────────────────────────────
  const analizarFicha = async (f: FichaDocumento) => {
    etapa('analizando');
    const resultado = await analizarDocumento(f.id);
    fijarAnalisis(resultado);
    panel.abrir({ tipo: 'documento' });
    await hablar('analisis', resumenAnalisis(f.nombre, resultado, f.escaneado?.paginas));
  };

  const analizarActivo = async () => {
    const f = fichaActiva();
    if (!f) { await abrirSelector('documento', true); return; }
    if (analisisRef.current && analisisRef.current.documento_id === f.id) {
      panel.abrir({ tipo: 'documento' });
      await hablar('analisis', resumenAnalisis(f.nombre, analisisRef.current));
      return;
    }
    await correr('analizando', () => analizarFicha(f), {
      prefijoError: 'No pude analizar el documento.', alReintentar: () => { void analizarActivo(); },
      mapear: mensajeDeCarga,
    });
  };

  const abrirSelector = async (para: DestinoArchivo, conVoz: boolean) => {
    panel.abrir({ tipo: 'archivo', para });
    if (!conVoz) return;
    await hablar('archivo', para === 'documento'
      ? 'Claro. Elige el documento en el panel: puedes subir un archivo o usar uno que ya tengas guardado.'
      : 'Elige el documento en el panel: puedes subir un archivo o usar uno guardado.');
  };

  const cerrarDocumento = async (conVoz: boolean) => {
    const f = fichaActiva();
    if (!f) {
      if (conVoz) await hablar('sin-documento', 'No hay ningún documento activo en esta llamada.');
      return;
    }
    fijarFicha(null);
    fijarAnalisis(null);
    e.elegirDocumento(null);
    if (panel.contenido?.tipo === 'documento') panel.cerrar();
    if (conVoz) await hablar('cerrar-documento', `Cerré ${nombreHablado(f.nombre)}. Ya no lo uso en la conversación.`);
  };

  // ── Elegir o subir el archivo (desde el panel) ──────────────────────────────────────
  const fichaDeItem = (item: ItemDocumento): FichaDocumento => ({
    id: item.id, nombre: item.nombre_archivo, tipo: item.tipo_documento, estado: item.estado,
  });

  /** Lo elegido —subido o guardado— sigue el camino de su destino. */
  const continuarConFicha = async (para: DestinoArchivo, elegida: FichaDocumento) => {
    if (para === 'documento') {
      activar(elegida);
      await analizarFicha(elegida);
      return;
    }
    const actual = seleccionRef.current ?? { a: null, b: null };
    if (para === 'comparar_a') {
      fijarSeleccion({ a: elegida, b: null });
      panel.abrir({ tipo: 'archivo', para: 'comparar_b' });
      await hablar('comparar-b', `Tengo ${nombreHablado(elegida.nombre)}. Ahora elige el segundo documento en el panel.`);
      return;
    }
    if (!actual.a) { fijarSeleccion({ a: null, b: elegida }); return; }
    fijarSeleccion({ a: actual.a, b: elegida });
    await compararInterno(actual.a, elegida);
  };

  const compararInterno = async (a: FichaDocumento, b: FichaDocumento) => {
    etapa('comparando');
    const resultado = await compararDocumentos(a.id, b.id);
    fijarComparacion(resultado);
    fijarSeleccion(null);
    panel.abrir({ tipo: 'comparacion' });
    await hablar('comparacion', resumenComparacion(resultado));
  };

  const elegirGuardado = async (para: DestinoArchivo, item: ItemDocumento) => {
    const elegida = fichaDeItem(item);
    const tipo: TipoOperacion = para === 'documento' ? 'analizando' : 'comparando';
    await correr(tipo, () => continuarConFicha(para, elegida), {
      prefijoError: para === 'documento' ? 'No pude procesar el documento.' : 'No pude comparar los documentos.',
      alReintentar: () => { void elegirGuardado(para, item); },
      mapear: para === 'documento' ? mensajeDeCarga : mensajeDeComparacion,
    });
  };

  const subirArchivo = async (para: DestinoArchivo, archivo: ArchivoSeleccionado, extra?: ExtraSubida) => {
    await correr('subiendo', async () => {
      const invalido = validar(archivo);
      if (invalido) throw { mensaje: invalido };
      const documento = await subirDocumento(archivo);
      if (documento.estado === 'fallido') {
        throw { mensaje: documento.motivo_fallo || 'No se pudo leer el texto del documento.' };
      }
      await continuarConFicha(para, {
        id: documento.id, nombre: documento.nombre_archivo,
        tipo: documento.tipo_documento, estado: documento.estado,
        ...(extra?.escaneado ? { escaneado: extra.escaneado } : {}),
      });
      // Todo salió bien: recién ahora pueden borrarse los temporales del escaneo.
      extra?.alExito?.();
    }, {
      prefijoError: extra?.escaneado ? 'No pude procesar el documento escaneado.' : 'No pude procesar el documento.',
      alReintentar: () => { void subirArchivo(para, archivo, extra); },
      mapear: (x) => (typeof (x as any)?.estado === 'number' ? mensajeDeCarga(x) : mensajeDe(x, 'No pude leer el archivo.')),
    });
  };

  /**
   * Abre el selector del sistema SIN abandonar la llamada. Mientras está abierto la app
   * queda «en segundo plano» para Android: `seleccionandoArchivo` evita que eso se tome
   * por un abandono y corte la voz del asistente.
   */
  const elegirArchivoNuevo = async (para: DestinoArchivo) => {
    if (ocupado.current) return;
    e.seleccionandoArchivo.current = true;
    e.antesDelSelector();
    let archivo: ArchivoSeleccionado | null = null;
    try {
      archivo = await seleccionarDocumento();
    } catch {
      e.seleccionandoArchivo.current = false;
      setAviso('No pude abrir el selector de archivos. Vuelve a intentarlo.');
      e.despuesDelSelector();
      return;
    }
    e.seleccionandoArchivo.current = false;
    if (!archivo) { e.despuesDelSelector(); return; } // canceló: la llamada sigue como estaba
    await subirArchivo(para, archivo);
  };

  // ── Comparar ────────────────────────────────────────────────────────────────────────
  const iniciarComparacion = async (texto: string) => {
    // «¿Qué diferencias hay entre ambos?» con una comparación ya hecha: se muestra, no se rehace.
    if (comparacionRef.current && !seleccionRef.current && /\bdiferencias?\b/.test(aPlano(texto))) {
      panel.abrir({ tipo: 'comparacion' });
      await hablar('comparacion', resumenComparacion(comparacionRef.current));
      return;
    }
    const activo = fichaActiva();
    if (activo) {
      fijarSeleccion({ a: activo, b: null });
      panel.abrir({ tipo: 'archivo', para: 'comparar_b' });
      await hablar('comparar', `Voy a comparar ${nombreHablado(activo.nombre)} con otro documento. Elige o sube el segundo en el panel.`);
    } else {
      fijarSeleccion({ a: null, b: null });
      panel.abrir({ tipo: 'archivo', para: 'comparar_a' });
      await hablar('comparar', 'Para comparar necesito dos documentos. Elige o sube el primero en el panel.');
    }
  };

  // ── Generar un documento (mismo interpretador y mismo generador que la pantalla Generar) ──
  const siguienteObligatorio = (b: BorradorEnCurso) =>
    b.pendientes.find((p) => p.obligatorio && !b.omitidos.includes(p.clave)) ?? null;

  const generarInterno = async (b: BorradorEnCurso) => {
    if (!b.tipo) return;
    etapa('generando');
    const resultado = await generarDocumento(b.tipo, b.datos);
    fijarGenerado(resultado);
    fijarBorrador(null);
    panel.abrir({ tipo: 'documento_generado' });
    await hablar('generado', resumenGenerado(resultado, false));
  };

  const generarBorrador = async (b: BorradorEnCurso) => {
    await correr('generando', () => generarInterno(b), {
      prefijoError: 'No pude generar el documento.', alReintentar: () => { void generarBorrador(b); },
    });
  };

  /** Pregunta el próximo dato obligatorio que falta (la respuesta llega en la siguiente frase). */
  const preguntarCampo = async (b: BorradorEnCurso) => {
    const campo = siguienteObligatorio(b);
    if (!campo || !b.tipo) return;
    const faltan = b.pendientes.filter((p) => p.obligatorio && !b.omitidos.includes(p.clave)).length;
    const actualizado: BorradorEnCurso = { ...b, preguntando: campo, yaPregunto: true };
    fijarBorrador(actualizado);
    if (!b.yaPregunto) panel.abrir({ tipo: 'borrador' });
    const intro = b.yaPregunto ? '' : `Voy a preparar un contrato de ${nombreTipoGenerado(b.tipo)}. `;
    await hablar('pregunta', intro + preguntaDeCampo(campo, !b.yaPregunto, faltan));
  };

  /** Una frase que describe el documento (o su tipo, si se había preguntado). */
  const interpretarFrase = async (texto: string) => {
    const previo = borradorRef.current;
    await correr('interpretando', async () => {
      const r = await interpretarPedido(texto, previo?.tipo ?? null, previo?.datos ?? {});
      if (r.requiere_tipo || !r.tipo_documento) {
        fijarBorrador({ tipo: null, datos: r.datos, pendientes: [], preguntando: null, omitidos: [], yaPregunto: false });
        await hablar('tipo', r.mensaje || MENSAJE_TIPO);
        return;
      }
      const nuevo: BorradorEnCurso = {
        tipo: r.tipo_documento, datos: r.datos, pendientes: r.campos_pendientes,
        preguntando: null, omitidos: previo?.omitidos ?? [], yaPregunto: previo?.yaPregunto ?? false,
      };
      fijarBorrador(nuevo);
      if (siguienteObligatorio(nuevo)) await preguntarCampo(nuevo);
      else await generarInterno(nuevo);
    }, {
      prefijoError: 'No pude interpretar el pedido del documento.',
      alReintentar: () => { void interpretarFrase(texto); },
    });
  };

  /** El valor dicho a una pregunta concreta: es el dato de ese campo, sin pasar por el modelo. */
  const responderCampo = async (texto: string) => {
    const b = borradorRef.current;
    if (!b || !b.preguntando) { await interpretarFrase(texto); return; }
    const campo = b.preguntando;
    const siguiente: BorradorEnCurso = {
      ...b, datos: { ...b.datos, [campo.clave]: texto.trim() },
      pendientes: b.pendientes.filter((p) => p.clave !== campo.clave), preguntando: null,
    };
    fijarBorrador(siguiente);
    if (siguienteObligatorio(siguiente)) await preguntarCampo(siguiente);
    else await generarBorrador(siguiente);
  };

  const flujoGeneracion = async (accion: 'cancelar' | 'generar_ya' | 'omitir' | 'responder', texto: string) => {
    const b = borradorRef.current;
    if (!b) return; // no hay una generación abierta: nada que responder ni cancelar
    if (accion === 'cancelar') {
      fijarBorrador(null);
      if (panel.contenido?.tipo === 'borrador') panel.cerrar();
      await hablar('cancelar', 'De acuerdo, cancelé la generación del documento.');
      return;
    }
    if (!b.tipo) { await interpretarFrase(texto); return; } // todavía se está eligiendo el tipo
    if (accion === 'generar_ya') { await generarBorrador({ ...b, preguntando: null }); return; }
    if (accion === 'omitir') {
      const campo = b.preguntando;
      const siguiente = { ...b, preguntando: null, omitidos: campo ? [...b.omitidos, campo.clave] : b.omitidos };
      fijarBorrador(siguiente);
      if (siguienteObligatorio(siguiente)) await preguntarCampo(siguiente);
      else await generarBorrador(siguiente);
      return;
    }
    await responderCampo(texto);
  };

  const flujoComparacion = async () => {
    fijarSeleccion(null);
    if (panel.contenido?.tipo === 'archivo') panel.cerrar();
    await hablar('cancelar', 'De acuerdo, cancelé la comparación.');
  };

  /** «Cambiá el plazo a 18 meses»: una versión nueva del mismo documento (la anterior se conserva). */
  const modificarGenerado = async (texto: string) => {
    const base = generadoRef.current;
    if (!base) { await hablar('sin-generado', 'Todavía no generé ningún documento que pueda modificar.'); return; }
    await correr('revisando', async () => {
      const nueva = await revisarDocumento(base.id, { instruccion: texto.slice(0, RECORTE_INSTRUCCION) });
      fijarGenerado(nueva);
      panel.abrir({ tipo: 'documento_generado' });
      await hablar('revision', resumenGenerado(nueva, true));
    }, {
      prefijoError: 'No pude aplicar el cambio.', alReintentar: () => { void modificarGenerado(texto); },
    });
  };

  // ── Reportes (mismo intérprete y mismo motor que la pantalla Reportes) ─────────────────
  const pedirReporte = async (texto: string, ajuste: boolean) => {
    await correr('reporte', async () => {
      // Solo se parte del reporte anterior cuando la frase es un ajuste del que está a la vista.
      const resultado = await generarReporte(texto, ajuste ? reporteRef.current?.especificacion ?? null : null);
      fijarReporte(resultado);
      panel.abrir({ tipo: 'reporte' });
      await hablar('reporte', resumenReporte(resultado, descargaDisponible));
    }, {
      prefijoError: 'No pude preparar ese reporte.', alReintentar: () => { void pedirReporte(texto, ajuste); },
    });
  };

  // ── Mostrar lo que ya existe ────────────────────────────────────────────────────────
  const mostrar = async (que: Exclude<ObjetoMostrable, 'respuesta'>) => {
    if (que === 'documento') {
      if (analisisRef.current) { panel.abrir({ tipo: 'documento' }); await hablar('mostrar', 'Aquí tienes el análisis del documento.'); return; }
      const f = fichaActiva();
      await hablar('sin-analisis', f
        ? `Todavía no analicé ${nombreHablado(f.nombre)}. Dime «analiza el documento» y lo hago.`
        : 'No hay ningún documento activo. Puedes pedirme que suba uno.');
      return;
    }
    if (que === 'comparacion') {
      if (comparacionRef.current) { panel.abrir({ tipo: 'comparacion' }); await hablar('mostrar', 'Aquí está la comparación.'); return; }
      await hablar('sin-comparacion', 'Todavía no comparé ningún documento. Dime «compara este contrato con otro».');
      return;
    }
    if (que === 'generado') {
      if (generadoRef.current) { panel.abrir({ tipo: 'documento_generado' }); await hablar('mostrar', 'Aquí está el documento generado.'); return; }
      await hablar('sin-generado', 'Todavía no generé ningún documento. Puedes pedirme, por ejemplo, un contrato de préstamo.');
      return;
    }
    if (reporteRef.current) { panel.abrir({ tipo: 'reporte' }); await hablar('mostrar', 'Aquí está el reporte.'); return; }
    await hablar('sin-reporte', 'Todavía no preparé ningún reporte. Puedes pedirme, por ejemplo, un reporte de mis documentos por tipo.');
  };

  // ── Descargas (solo existen en la versión web; en el teléfono se dice, no se finge) ───────
  const exportarBorradorGenerado = async (formato: FormatoBorrador) => {
    const g = generadoRef.current;
    if (!g) return;
    setExportando(formato);
    setAviso(null);
    try { guardarArchivo(await exportarBorrador(g.id, formato)); }
    catch (error) { setAviso(mensajeDe(error, 'No se pudo exportar el borrador.')); }
    finally { setExportando(null); }
  };

  const exportarReporteActual = async (formato: FormatoExportacion) => {
    const r = reporteRef.current;
    if (!r) return;
    setExportando(formato);
    setAviso(null);
    try { guardarArchivo(await exportarReporte(r.especificacion, formato, r.peticion)); }
    catch (error) { setAviso(mensajeDe(error, 'No se pudo exportar el reporte.')); }
    finally { setExportando(null); }
  };

  // ── Escáner con cámara: otra forma de ingresar un documento ────────────────────────────
  const escaner = useEscanerLlamada({
    panel, activa, hablar, correr, avanzarOperacion, subirArchivo, mostrarFallo,
    ocupado, escanerAbierto: e.escanerAbierto, seleccionandoArchivo: e.seleccionandoArchivo,
    pausarEscucha: e.antesDelSelector, reanudarEscucha: e.despuesDelSelector,
  });

  // ── Archivos: los que llegan de otras apps y los que salen (guardar / compartir) ────────
  const recibidosLl = useRecibidosLlamada({ panel, hablar, subirArchivo, ocupado, saludado: e.saludado, anuncioInicial: e.anuncioInicial });
  const salida = useSalidaLlamada({
    panel, generado: () => generadoRef.current, reporte: () => reporteRef.current, hablar,
    seleccionandoArchivo: e.seleccionandoArchivo, pausarEscucha: e.antesDelSelector, reanudarEscucha: e.despuesDelSelector,
  });

  // ── Recordatorios locales: propuesta → confirmación → Android agenda ────────────────────
  const recordatoriosLl = useRecordatoriosLlamada({
    panel, hablar, ficha: fichaActiva(), analisis, verDocumento: (item) => elegirGuardado('documento', item),
    seleccionandoArchivo: e.seleccionandoArchivo, pausarEscucha: e.antesDelSelector, reanudarEscucha: e.despuesDelSelector,
    saludado: e.saludado, anuncioInicial: e.anuncioInicial,
  });

  // ── Despacho ────────────────────────────────────────────────────────────────────────
  const contexto = (): ContextoIntencion => ({
    documentoActivo: fichaActiva() !== null,
    analisis: analisisRef.current !== null,
    comparacion: comparacionRef.current !== null,
    generado: generadoRef.current !== null,
    reporte: reporteRef.current !== null,
    flujo: borradorRef.current ? 'generacion'
      : seleccionRef.current ? 'comparacion'
      : escaner.hayEscaneoPendiente() ? 'escaneo' : null,
    recibido: recibidosLl.recibidos.length > 0,
    ...recordatoriosLl.contexto(),
  });

  // ── Ayuda: «¿qué podés hacer?» se responde aquí, con el catálogo, sin consulta jurídica ─────────────
  const ayuda = useAyudaLlamada({ panel, hablar, contexto });

  /** Ejecuta una orden que NO es una consulta. La consulta jurídica la resuelve `useLlamada`. */
  const ejecutar = async (intencion: IntencionLlamada, texto: string) => {
    switch (intencion.tipo) {
      case 'ayuda': return ayuda.explicarPorVoz(intencion.tema);
      case 'subir_documento': return abrirSelector('documento', true);
      case 'analizar_documento': return analizarActivo();
      case 'cerrar_documento': return cerrarDocumento(true);
      case 'comparar': return iniciarComparacion(texto);
      case 'generar_documento': return interpretarFrase(texto);
      case 'modificar_generado': return modificarGenerado(texto);
      case 'reporte': return pedirReporte(texto, intencion.ajuste);
      case 'mostrar': return intencion.que === 'respuesta' ? undefined : mostrar(intencion.que);
      case 'escanear': return escaner.iniciar(intencion.modo, 'documento', true);
      case 'recordatorio':
        if (intencion.accion === 'crear') recordatoriosLl.crearPorVoz(texto);
        else if (intencion.accion === 'listar') recordatoriosLl.listar();
        else if (intencion.accion === 'cancelar') recordatoriosLl.cancelarPorVoz(texto);
        else recordatoriosLl.editarPorVoz(texto);
        return recordatoriosLl.esperarHabla();
      case 'recordatorio_respuesta':
        if (intencion.accion === 'ajustar') recordatoriosLl.ajustar(texto);
        else recordatoriosLl.responder(intencion.accion);
        return recordatoriosLl.esperarHabla();
      case 'analizar_escaneo': return escaner.analizar();
      case 'analizar_recibido': {
        const r = await recibidosLl.analizarPorVoz();
        if (r === 'varios') await hablar('varios', 'Tengo varios archivos recibidos. Elige en el panel cuál quieres que analice.');
        return undefined;
      }
      case 'salida': {
        const enPanel = panel.contenido?.tipo === 'reporte' ? 'reporte'
          : panel.contenido?.tipo === 'documento_generado' ? 'generado' : null;
        return salida.porVoz(intencion.accion, intencion.objeto, enPanel);
      }
      case 'flujo':
        if (borradorRef.current) return flujoGeneracion(intencion.accion, texto);
        if (intencion.accion !== 'cancelar') return undefined;
        if (seleccionRef.current) return flujoComparacion();
        if (recibidosLl.recibidos.length > 0 || recibidosLl.fallidos.length > 0) {
          recibidosLl.descartarTodo();
          return hablar('descartar-recibido', 'De acuerdo, descarté el archivo.');
        }
        return escaner.cancelarPorVoz();
      default: return undefined;
    }
  };

  return {
    // Lo que la sesión guarda mientras la llamada está abierta
    ficha: fichaActiva(), analisis, seleccion, comparacion, borrador, generado, reporte,
    operacion, exportando, aviso,
    contexto, ejecutar,
    // Lo que también disparan los botones del panel (sin hablar: un toque no le pisa la voz)
    abrirSelector: (para: DestinoArchivo) => abrirSelector(para, false),
    elegirArchivoNuevo, elegirGuardado, cerrarDocumento: () => cerrarDocumento(false),
    analizarActivo, reintentarOperacion,
    cancelarGeneracion: () => flujoGeneracion('cancelar', ''),
    cancelarComparacion: () => flujoComparacion(),
    exportarBorradorGenerado, exportarReporteActual,
    /** La cámara, las páginas, el OCR y la cláusula fotografiada. */
    escaner,
    /** Archivos compartidos desde otras apps (WhatsApp, Gmail, Drive…) esperando decisión. */
    recibidos: recibidosLl,
    /** Guardar en el teléfono y compartir el documento generado o el reporte. */
    salida,
    /** Recordatorios jurídicos locales (notificaciones de Android, con confirmación explícita). */
    recordatorios: recordatoriosLl,
    /** «¿Qué puedo hacer?»: el catálogo de capacidades, en el panel y por voz. */
    ayuda,
  };
}

export type AccionesLlamada = ReturnType<typeof useAccionesLlamada>;
