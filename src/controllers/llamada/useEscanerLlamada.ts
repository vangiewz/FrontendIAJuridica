import { MutableRefObject, useEffect, useRef, useState } from 'react';
import { Linking } from 'react-native';
import { ArchivoSeleccionado } from '../../models/documentos';
import {
  DestinoArchivo, ExtraSubida, ModoEscaner, OpcionesOperacion, PermisoEscaner, TipoOperacion,
} from '../../models/llamada';
import {
  armarTextoEscaneo, componerConsultaConClausula, estadoDeTexto, evaluarSuficiencia, moverPagina,
  nombreArchivoClausula, nombreArchivoEscaneo, PaginaEscaneada,
} from '../../services/escaner/escanerPuro';
import { OCR_DISPONIBLE, reconocerTexto } from '../../services/escaner/ocrLocal';
import { borrarArchivo, borrarArchivos, prepararImagen, rotarImagen } from '../../services/escaner/imagenes';
import { crearArchivoDeTexto } from '../../services/escaner/textoComoArchivo';
import { consultarPermisoCamara, pedirPermisoCamara } from '../../services/escaner/permisoCamara';
import { resumenEscaneo } from '../../services/llamada/resumenVoz';
import { PanelLlamada } from './usePanelLlamada';
import { useEstado } from './useEstado';

/**
 * El ESCÁNER de la llamada: una forma nueva de INGRESAR un documento, no un sistema nuevo.
 *
 *   cámara (páginas) → OCR local por página → texto → archivo .txt → `subirArchivo`
 *
 * Desde `subirArchivo` es el MISMO camino que un PDF elegido en Archivos: `subirDocumento`,
 * `analizarDocumento`, documento activo, voz del resultado, preguntas, comparación, reportes.
 * Aquí solo se guardan las páginas de la sesión y se reconocen sus textos.
 *
 * La cámara es un overlay dentro de la pantalla de llamada (no una ruta), así que
 * `useLlamada` no se desmonta: no se pierde la sesión, el panel ni la consulta en curso. Y
 * abrirla no toca la voz: el asistente puede seguir hablando; solo se PAUSA la escucha
 * (`escanerAbierto`), que es distinto de finalizar la llamada.
 */

export interface EntradasEscaner {
  panel: PanelLlamada;
  activa: () => boolean;
  hablar: (etiqueta: string, texto: string) => Promise<void>;
  correr: (tipo: TipoOperacion, tarea: () => Promise<void>, opciones: OpcionesOperacion) => Promise<void>;
  /** Cambia solo el texto de la operación en curso (p. ej. «Reconociendo página 2 de 4…»). */
  avanzarOperacion: (texto: string) => void;
  /** El mismo `subirArchivo` de los documentos: sube y analiza. */
  subirArchivo: (para: DestinoArchivo, archivo: ArchivoSeleccionado, extra?: ExtraSubida) => Promise<void>;
  /** Muestra un fallo (panel de error + «Reintentar») sin cerrar la llamada. */
  mostrarFallo: (mensaje: string, alReintentar: () => void) => void;
  ocupado: MutableRefObject<boolean>;
  /** La cámara está abierta: el micrófono no debe abrirse (lo lee `escuchar`). */
  escanerAbierto: MutableRefObject<boolean>;
  /** Un diálogo del sistema (permiso de la cámara) tapa la app: no es un abandono. */
  seleccionandoArchivo: MutableRefObject<boolean>;
  pausarEscucha: () => void;
  reanudarEscucha: () => void;
}

interface EstadoCamara {
  modo: ModoEscaner;
  destino: DestinoArchivo;
  permiso: PermisoEscaner;
}

type FaseEscaneo = 'ninguno' | 'capturando' | 'reconociendo' | 'listo';

let contador = 0;
const nuevoId = () => `pag-${Date.now()}-${++contador}`;

/** El OCR nativo falla distinto si no está en la compilación que si falló una imagen. */
function motivoOcr(error: unknown): string {
  const mensaje = String((error as { message?: string })?.message ?? '');
  if (/linked|rebuilt|undefined is not|of undefined/i.test(mensaje)) {
    return 'El reconocimiento de texto no está disponible en esta compilación de la app.';
  }
  return 'No pude reconocer el texto de esta página.';
}

export function useEscanerLlamada(e: EntradasEscaner) {
  const [camara, fijarCamara, camaraRef] = useEstado<EstadoCamara | null>(null);
  const [paginas, fijarPaginas, paginasRef] = useEstado<PaginaEscaneada[]>([]);
  const [fase, fijarFase, faseRef] = useEstado<FaseEscaneo>('ninguno');
  const [modo, fijarModo, modoRef] = useEstado<ModoEscaner>('documento');
  const [destino, fijarDestino, destinoRef] = useEstado<DestinoArchivo>('documento');
  const [clausula, fijarClausula, clausulaRef] = useEstado<{ texto: string } | null>(null);
  const [seleccionada, setSeleccionada] = useState<string | null>(null);
  const [reemplazando, fijarReemplazando, reemplazandoRef] = useEstado<string | null>(null);
  const [capturando, setCapturando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [confirmandoCancelar, setConfirmandoCancelar] = useState(false);
  const ocupadoImagen = useRef(false);
  const borrarTxt = useRef<(() => void) | null>(null);

  const { panel, hablar } = e;

  // ── Temporales ──────────────────────────────────────────────────────────────────────
  const descartarPaginas = () => {
    borrarArchivos(paginasRef.current.map((p) => p.uri));
    fijarPaginas([]);
    fijarFase('ninguno');
    setSeleccionada(null);
    fijarReemplazando(null);
    setAviso(null);
  };
  const soltarTxt = () => { borrarTxt.current?.(); borrarTxt.current = null; };

  // Al terminar la llamada no queda ningún temporal de escaneo en la caché.
  useEffect(() => () => {
    borrarArchivos(paginasRef.current.map((p) => p.uri));
    borrarTxt.current?.();
  }, [paginasRef]);

  const actualizarPagina = (id: string, cambio: Partial<PaginaEscaneada>) => {
    fijarPaginas(paginasRef.current.map((p) => (p.id === id ? { ...p, ...cambio } : p)));
  };

  // ── Cámara y permiso ────────────────────────────────────────────────────────────────
  const fijarPermiso = (permiso: PermisoEscaner) => {
    const actual = camaraRef.current;
    if (actual) fijarCamara({ ...actual, permiso });
  };

  const comprobarPermiso = async () => {
    fijarPermiso('verificando');
    try {
      let permiso = await consultarPermisoCamara();
      if (!permiso.concedido && permiso.puedePreguntar) {
        // El diálogo del sistema tapa la app: para Android es «segundo plano», pero no es un abandono.
        e.seleccionandoArchivo.current = true;
        try { permiso = await pedirPermisoCamara(); } finally { e.seleccionandoArchivo.current = false; }
      }
      fijarPermiso(permiso.concedido ? 'ok' : permiso.puedePreguntar ? 'denegado' : 'denegado_definitivo');
      return permiso.concedido;
    } catch {
      fijarPermiso('no_disponible');
      return false;
    }
  };

  const cerrarCamara = () => {
    e.escanerAbierto.current = false;
    fijarCamara(null);
    setConfirmandoCancelar(false);
  };

  /** Abre la cámara. Pausa la ESCUCHA (no la voz del asistente) mientras se fotografía. */
  const abrirCamara = async (nuevoModo: ModoEscaner, nuevoDestino: DestinoArchivo, conVoz: boolean) => {
    e.escanerAbierto.current = true;
    e.pausarEscucha();
    fijarModo(nuevoModo);
    fijarDestino(nuevoDestino);
    fijarFase('capturando');
    fijarCamara({ modo: nuevoModo, destino: nuevoDestino, permiso: 'verificando' });
    const concedido = await comprobarPermiso();
    if (conVoz) {
      void hablar('escaner', concedido
        ? (nuevoModo === 'documento' ? 'Claro. Escanea las páginas del documento.' : 'Claro. Fotografía la cláusula.')
        : 'No tengo permiso para usar la cámara.');
    }
  };

  /** Empieza un escaneo NUEVO (descarta uno anterior que no se haya enviado). */
  const iniciar = async (nuevoModo: ModoEscaner, nuevoDestino: DestinoArchivo = 'documento', conVoz = false) => {
    if (!OCR_DISPONIBLE) {
      await hablar('sin-ocr', 'Escanear con la cámara solo está disponible en el teléfono Android.');
      return;
    }
    if (e.ocupado.current || e.escanerAbierto.current) return;
    descartarPaginas();
    soltarTxt();
    await abrirCamara(nuevoModo, nuevoDestino, conVoz);
  };

  /** Vuelve a la cámara CON las páginas ya tomadas (agregar, repetir, rotar, reordenar). */
  const editarPaginas = async () => {
    if (e.ocupado.current || e.escanerAbierto.current) return;
    fijarFase('capturando');
    await abrirCamara(modoRef.current, destinoRef.current, false);
  };

  const reintentarPermiso = async () => { await comprobarPermiso(); };
  const abrirAjustes = () => { void Linking.openSettings(); };

  // ── Capturar y editar páginas ───────────────────────────────────────────────────────
  /**
   * Toma UNA foto con `tomarFoto` (la cámara la tiene el overlay), la deja lista para el OCR y
   * la agrega —o reemplaza la que se está repitiendo—. En modo cláusula hay una sola página.
   */
  const capturar = async (tomarFoto: () => Promise<{ uri: string; width: number; height: number }>) => {
    if (ocupadoImagen.current) return;
    ocupadoImagen.current = true;
    setCapturando(true);
    setAviso(null);
    try {
      const foto = await tomarFoto();
      const lista = paginasRef.current;
      const paraReemplazar = modoRef.current === 'clausula' ? lista[0]?.id ?? null : reemplazandoRef.current;
      const preparada = await prepararImagen(foto.uri, foto.width, foto.height);
      const nueva: PaginaEscaneada = {
        id: nuevoId(), uri: preparada.uri, ancho: preparada.ancho, alto: preparada.alto, texto: null, estado: 'pendiente',
      };
      if (paraReemplazar) {
        const vieja = lista.find((p) => p.id === paraReemplazar);
        borrarArchivo(vieja?.uri);
        fijarPaginas(lista.map((p) => (p.id === paraReemplazar ? nueva : p)));
        fijarReemplazando(null);
      } else {
        fijarPaginas([...lista, nueva]);
      }
      setSeleccionada(nueva.id);
      if (modoRef.current === 'clausula') { ocupadoImagen.current = false; setCapturando(false); await terminar(); return; }
    } catch {
      setAviso('No pude tomar la foto. Intenta de nuevo.');
    } finally {
      ocupadoImagen.current = false;
      setCapturando(false);
    }
  };

  const eliminar = (id: string) => {
    borrarArchivo(paginasRef.current.find((p) => p.id === id)?.uri);
    fijarPaginas(paginasRef.current.filter((p) => p.id !== id));
    if (reemplazandoRef.current === id) fijarReemplazando(null);
    setSeleccionada((actual) => (actual === id ? null : actual));
  };

  const rotar = async (id: string) => {
    const pagina = paginasRef.current.find((p) => p.id === id);
    if (!pagina || ocupadoImagen.current) return;
    ocupadoImagen.current = true;
    setCapturando(true);
    try {
      const girada = await rotarImagen(pagina.uri);
      // Otra imagen: el texto reconocido antes ya no vale y se vuelve a leer.
      actualizarPagina(id, { uri: girada.uri, ancho: girada.ancho, alto: girada.alto, texto: null, estado: 'pendiente', motivo: undefined });
    } catch {
      setAviso('No pude rotar la página.');
    } finally {
      ocupadoImagen.current = false;
      setCapturando(false);
    }
  };

  const mover = (id: string, delta: number) => fijarPaginas(moverPagina(paginasRef.current, id, delta));
  /** La próxima foto REEMPLAZA esta página. */
  const repetir = (id: string) => { fijarReemplazando(id); setSeleccionada(id); };
  const cancelarReemplazo = () => fijarReemplazando(null);

  // ── Reconocer (OCR local por página) ────────────────────────────────────────────────
  const reconocer = async () => {
    const elModo = modoRef.current;
    panel.abrir({ tipo: elModo === 'clausula' ? 'clausula' : 'escaneo' });
    fijarFase('reconociendo');
    await e.correr('reconociendo', async () => {
      const total = paginasRef.current.length;
      for (let i = 0; i < total; i++) {
        const pagina = paginasRef.current[i];
        if (!pagina || pagina.estado === 'ok' || pagina.estado === 'vacia') continue; // ya leída
        e.avanzarOperacion(total > 1 ? `Reconociendo página ${i + 1} de ${total}…` : 'Reconociendo el texto…');
        try {
          const texto = await reconocerTexto(pagina.uri);
          actualizarPagina(pagina.id, { texto, estado: estadoDeTexto(texto), motivo: undefined });
        } catch (error) {
          actualizarPagina(pagina.id, { texto: null, estado: 'error', motivo: motivoOcr(error) });
        }
      }
      fijarFase('listo');
      const lista = paginasRef.current;
      const sinTexto = lista.filter((p) => p.estado === 'vacia').length;
      const fallidas = lista.filter((p) => p.estado === 'error').length;

      if (elModo === 'clausula') {
        const pagina = lista[0];
        if (pagina?.estado === 'ok' && pagina.texto) {
          fijarClausula({ texto: pagina.texto });
          await hablar('clausula', 'Leí la cláusula. Ya puedes preguntarme sobre ella, o convertirla en documento.');
        } else {
          await hablar('clausula-vacia', pagina?.estado === 'error'
            ? 'No pude leer la foto. Intenta de nuevo.'
            : 'No pude leer texto en la foto. Repítela con buena luz y enfocando la cláusula.');
        }
        return;
      }
      panel.abrir({ tipo: 'escaneo' });
      await hablar('ocr', resumenEscaneo(lista.length, sinTexto, fallidas));
    }, {
      prefijoError: 'No pude reconocer el texto.',
      alReintentar: () => { void reconocer(); },
    });
  };

  /** «Finalizar» en la cámara: se cierra y se reconoce el texto de las páginas nuevas. */
  const terminar = async () => {
    if (paginasRef.current.length === 0) { setAviso('Captura al menos una página.'); return; }
    cerrarCamara();
    await reconocer();
  };

  // ── Cancelar / repetir ──────────────────────────────────────────────────────────────
  const cancelar = () => {
    cerrarCamara();
    descartarPaginas();
    soltarTxt();
    const arriba = panel.contenido?.tipo;
    if (arriba === 'escaneo' || arriba === 'texto_ocr' || arriba === 'clausula') panel.cerrar();
    e.reanudarEscucha();
  };

  /** Cancelar desde la cámara: con páginas tomadas pide confirmación antes de descartarlas. */
  const solicitarCancelar = () => {
    if (camaraRef.current && paginasRef.current.length > 0 && !confirmandoCancelar) {
      setConfirmandoCancelar(true);
      return;
    }
    cancelar();
  };
  const seguirEscaneando = () => setConfirmandoCancelar(false);

  const repetirEscaneo = async () => {
    const elModo = modoRef.current;
    const elDestino = destinoRef.current;
    cancelar();
    await iniciar(elModo, elDestino, false);
  };

  // ── Del escaneo al documento (el flujo documental de siempre) ───────────────────────
  const enviarComoDocumento = async (
    texto: string, nombre: string, numeroPaginas: number, alExito: () => void, para: DestinoArchivo,
  ) => {
    const suficiencia = evaluarSuficiencia(texto);
    if (suficiencia.estado === 'vacio') {
      await hablar('ocr-vacio', 'No se reconoció texto. Repite el escaneo con más luz y con el documento bien enfocado.');
      return;
    }
    if (suficiencia.estado === 'corto') {
      await hablar('ocr-corto',
        `Solo se reconocieron ${suficiencia.caracteres} caracteres, y el sistema necesita al menos 200 para tratarlo como documento. Agrega páginas o repite el escaneo.`);
      return;
    }
    let creado: ReturnType<typeof crearArchivoDeTexto>;
    try {
      soltarTxt();
      creado = crearArchivoDeTexto(nombre, texto);
    } catch {
      e.mostrarFallo('No pude preparar el archivo temporal del escaneo.', () => { void enviarComoDocumento(texto, nombre, numeroPaginas, alExito, para); });
      return;
    }
    borrarTxt.current = creado.borrar;
    await e.subirArchivo(para, creado.archivo, {
      escaneado: { paginas: numeroPaginas },
      alExito: () => { soltarTxt(); alExito(); },
    });
  };

  /** «Analizar documento»: el texto del escaneo entra por el mismo subir + analizar que un PDF. */
  const analizar = async () => {
    const lista = paginasRef.current;
    if (lista.length === 0 || e.ocupado.current) return;
    await enviarComoDocumento(
      armarTextoEscaneo(lista), nombreArchivoEscaneo(new Date(), lista.length), lista.length,
      () => { descartarPaginas(); }, destinoRef.current,
    );
  };

  // ── Modo cláusula ───────────────────────────────────────────────────────────────────
  const convertirClausulaEnDocumento = async () => {
    const actual = clausulaRef.current;
    if (!actual || e.ocupado.current) return;
    await enviarComoDocumento(
      actual.texto, nombreArchivoClausula(new Date()), 1,
      () => { fijarClausula(null); descartarPaginas(); }, 'documento',
    );
  };

  const quitarClausula = () => {
    fijarClausula(null);
    descartarPaginas();
    if (panel.contenido?.tipo === 'clausula') panel.cerrar();
  };

  const preguntarSobreClausula = () => hablar('clausula-pregunta', 'Te escucho. ¿Qué quieres saber sobre la cláusula?');

  /** La pregunta lleva la cláusula fotografiada como contexto (mismo endpoint de consultas). */
  const componerConsulta = (pregunta: string) =>
    clausulaRef.current ? componerConsultaConClausula(clausulaRef.current.texto, pregunta) : pregunta;

  const cancelarPorVoz = async () => {
    cancelar();
    await hablar('cancelar-escaneo', 'De acuerdo, descarté el escaneo.');
  };

  /** Hay un escaneo ya leído esperando que se lo analice o se lo descarte. */
  const pendiente = fase === 'listo' && modo === 'documento' && paginas.length > 0;

  return {
    // Lo que dibuja el overlay de la cámara
    camara, paginas, seleccionada, reemplazando, capturando, aviso, confirmandoCancelar,
    seleccionar: setSeleccionada,
    // Lo que dibuja el panel
    fase, modo, destino, clausula, pendiente,
    // Acciones
    iniciar, editarPaginas, capturar, eliminar, rotar, mover, repetir, cancelarReemplazo, terminar,
    solicitarCancelar, seguirEscaneando, cancelar, cancelarPorVoz, repetirEscaneo, reintentarPermiso, abrirAjustes,
    analizar, convertirClausulaEnDocumento, quitarClausula, preguntarSobreClausula, componerConsulta,
    reconocer,
    /** Lo lee el enrutador de voz: ¿hay un escaneo ya leído esperando decisión? */
    hayEscaneoPendiente: () => faseRef.current === 'listo' && modoRef.current === 'documento' && paginasRef.current.length > 0,
  };
}

export type EscanerLlamada = ReturnType<typeof useEscanerLlamada>;
