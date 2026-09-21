import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { EstadoAvatar, resolverEstadoAvatar } from '../../components/avatar/estados';
import { DocumentoActivo, useAsistente } from './useAsistente';
import { useDictado } from '../voz/useDictado';
import { useHablando } from '../voz/useHablando';
import { detener as detenerLectura, leer, obtenerEstadoLectura } from '../../services/voz/lectura';
import { textoParaLectura } from '../../services/voz/textoLectura';
import { RespuestaJuridicaIA } from '../../models/consultas';
import { detectarIntencionLlamada } from '../../services/llamada/intencion';
import { usePanelLlamada } from '../llamada/usePanelLlamada';
import { useAccionesLlamada } from '../llamada/useAccionesLlamada';

/**
 * MODO LLAMADA: la conversación por voz con el asistente, sin salir de su pantalla.
 *
 * No es otra IA ni otro flujo: es un controlador que ORQUESTA los servicios que ya usa el
 * chat —`useAsistente` (mismo endpoint, mismo historial), `useDictado` (voz → texto) y la
 * lectura en voz alta (`leer`)— encadenándolos solos:
 *
 *   escuchar → texto → preguntar → esperar → leer la respuesta → escuchar → …
 *
 * La diferencia con el chat es solo esa: aquí el texto dictado se envía sin pasar por el
 * campo editable y la respuesta se lee sola. Nada navega; el contexto entre turnos es el
 * que el backend ya ofrece (el documento activo): no hay memoria nueva en el cliente.
 *
 * Es también la FUENTE DE VERDAD de toda la sesión: la respuesta, el documento activo, el
 * análisis, la comparación, el documento generado, el reporte y el panel abierto viven
 * aquí (o en los dos hooks que compone: `usePanelLlamada` y `useAccionesLlamada`) y sobreviven
 * mientras la llamada esté abierta. La VOZ y el PANEL son estados independientes: abrir,
 * cerrar, minimizar o cambiar de pestaña el panel no llama a `detenerLectura`, no toca el
 * micrófono ni el sondeo. Solo callan al asistente: interrumpir, finalizar o un error de la voz.
 */

const ETIQUETA_KEEP_AWAKE = 'llamada-asistente';
export const SALUDO = 'Hola, soy tu asistente jurídico. ¿En qué puedo ayudarte?';
const MENSAJE_VOZ = 'No pude escucharte. Intenta nuevamente.';
const MENSAJE_CONEXION = 'No pude conectar con el asistente.';
const MENSAJE_SIN_RESPUESTA = 'No pude preparar una respuesta. Intenta nuevamente.';
const MENSAJE_SIN_VOZ_TTS = 'No pude reproducir la voz. Esta es la respuesta:';
/** Errores del dictado que se resumen en el mensaje genérico; el resto explica su causa. */
const ERRORES_GENERICOS = ['sin_voz', 'desconocido', 'ocupado'];
/**
 * Pausa antes de empezar a hablar o escuchar al entrar o volver a la pantalla: el chat de
 * debajo corta la lectura al perder el foco y no debe cortar también el saludo.
 */
const ESPERA_FOCO_MS = 450;

type FalloLlamada = { tipo: 'voz' | 'conexion' | 'respuesta' | 'operacion'; mensaje: string };

/** Qué hace el botón del micrófono ahora mismo (lo decide el controlador, no la pantalla). */
export type ModoMicrofono = 'activo' | 'silenciado' | 'interrumpir' | 'hablar';

/** Lo que la IA debe decir: la conclusión útil, no las fuentes ni el análisis completo. */
const textoDeRespuesta = (r: RespuestaJuridicaIA) => r.conclusion?.trim() || r.resumen_caso?.trim() || '';

const primeraEnMayuscula = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

export function useLlamada(documentoInicial: DocumentoActivo | null) {
  const asistente = useAsistente(documentoInicial);
  const { intercambios, enviando, preguntar, reintentar: reintentarSeguimiento, detener: detenerConsulta } = asistente;
  const hablando = useHablando();

  const [silenciado, setSilenciado] = useState(false);
  const [transcripcion, setTranscripcion] = useState('');
  const [fallo, setFallo] = useState<FalloLlamada | null>(null);
  const [lecturaFallida, setLecturaFallida] = useState<string | null>(null);
  const [enfocada, setEnfocada] = useState(true);

  const finalizada = useRef(false);
  const esperando = useRef(false);          // se envió una consulta y aún no se atendió su resultado
  const silenciadoRef = useRef(false);
  const enfocadaRef = useRef(true);
  const saludado = useRef(false);
  const segundoPlano = useRef(false);
  const ocupado = useRef(false);            // una operación (subir, comparar, generar…) está en curso
  const seleccionandoArchivo = useRef(false); // un diálogo del sistema (selector de archivos, permiso) tapa la app
  const anuncioInicial = useRef<string | null>(null); // aviso de un archivo recibido que llegó ANTES del saludo: lo sustituye
  const escanerAbierto = useRef(false);     // la cámara del escáner está abierta: la ESCUCHA se pausa, la voz no
  const despacharRef = useRef<(texto: string) => void>(() => undefined);
  const panel = usePanelLlamada();

  const ultimo = intercambios[intercambios.length - 1];
  /** La última consulta que ya tiene respuesta: lo que muestra el panel «Respuesta». */
  const ultimoRespondido = [...intercambios].reverse().find((i) => i.consulta?.respuesta) ?? null;

  // ── Escuchar ────────────────────────────────────────────────────────────────────────
  const voz = useDictado((texto) => {
    if (finalizada.current) return;
    const limpio = texto.trim();
    setTranscripcion(primeraEnMayuscula(limpio));
    if (limpio.length < 3) { setFallo({ tipo: 'voz', mensaje: MENSAJE_VOZ }); return; }
    setFallo(null);
    despacharRef.current(limpio);
  });
  const { iniciar: iniciarDictado, cancelar: cancelarDictado } = voz;

  /** Abre el micrófono si corresponde: no lo hace en silencio, en segundo plano ni con una consulta en curso. */
  const escuchar = useCallback(() => {
    if (finalizada.current || silenciadoRef.current || esperando.current || ocupado.current || escanerAbierto.current || !enfocadaRef.current) return;
    if (AppState.currentState !== 'active') return;
    detenerLectura(); // el micrófono captaría la propia voz del asistente
    setTranscripcion('');
    setFallo(null);
    setLecturaFallida(null);
    void iniciarDictado();
  }, [iniciarDictado]);

  // ── Hablar ──────────────────────────────────────────────────────────────────────────
  /** Lee `texto` con la voz del teléfono y, al terminar, vuelve a escuchar. */
  const decir = useCallback((id: string, texto: string, mostrarSiFalla: boolean) => {
    setLecturaFallida(null);
    void leer(id, texto, (error) => {
      if (finalizada.current) return;
      if (error && mostrarSiFalla) { setLecturaFallida(textoParaLectura(texto)); return; }
      escuchar();
    });
  }, [escuchar]);

  /** La consulta jurídica de siempre: se envía, se espera, se lee y se vuelve a escuchar. */
  const consultar = (texto: string) => {
    esperando.current = true;
    // Con una cláusula fotografiada activa, la pregunta lleva su texto como contexto.
    void preguntar(acciones.escaner.componerConsulta(texto)).then((aceptada) => {
      if (!aceptada) { esperando.current = false; setFallo({ tipo: 'conexion', mensaje: MENSAJE_CONEXION }); }
    });
  };

  // ── Las demás órdenes: documentos, comparación, generación y reportes ───────────────
  const acciones = useAccionesLlamada({
    documento: asistente.documento, elegirDocumento: asistente.elegirDocumento, panel, ocupado,
    activa: () => !finalizada.current,
    // Un aviso hablado que no responde a lo que el usuario acaba de decir (un archivo que llega, un
    // resultado): se cierra antes la escucha, para que el micrófono no capte la voz del asistente.
    decir: (id, texto) => { cancelarDictado(); decir(id, texto, true); },
    saludado, anuncioInicial,
    fallar: (mensaje) => {
      setFallo({ tipo: 'operacion', mensaje });
      decir(`llamada-error-${Date.now()}`, mensaje, true);
    },
    seleccionandoArchivo, escanerAbierto,
    antesDelSelector: () => cancelarDictado(),
    // Si el asistente sigue hablando NO se llama a `escuchar` (cortaría su voz): al terminar,
    // la propia lectura vuelve a escuchar.
    despuesDelSelector: () => { if (obtenerEstadoLectura().id === null) escuchar(); },
  });

  /** Qué hace la llamada con lo que el usuario dijo: consulta jurídica o una orden a un módulo. */
  const despachar = (texto: string) => {
    const intencion = detectarIntencionLlamada(texto, acciones.contexto());
    // Una oferta de recordatorio sin contestar caduca en cuanto el usuario habla de otra cosa.
    acciones.recordatorios.expirarOferta(intencion.tipo === 'recordatorio' || intencion.tipo === 'recordatorio_respuesta');
    if (intencion.tipo === 'recordatorio_respuesta' && intencion.accion === 'ajustar' && !acciones.recordatorios.ajustar(texto)) {
      consultar(texto); // no traía una fecha: era una pregunta cualquiera
      return;
    }
    if (intencion.tipo === 'recordatorio_respuesta' && intencion.accion === 'ajustar') return;
    if (intencion.tipo === 'consulta') { consultar(texto); return; }
    if (intencion.tipo === 'panel') {
      if (intencion.accion === 'cerrar') panel.cerrar();
      else if (intencion.accion === 'minimizar') panel.minimizar();
      else panel.expandir();
      escuchar(); // solo cambió lo que se ve: la llamada sigue escuchando
      return;
    }
    if (intencion.tipo === 'mostrar' && intencion.que === 'respuesta') {
      if (ultimoRespondido) panel.abrir({ tipo: 'respuesta' });
      decir(`llamada-mostrar-${Date.now()}`, ultimoRespondido
        ? 'Aquí tienes la respuesta y sus fuentes.'
        : 'Todavía no tengo una respuesta para mostrarte.', true);
      return;
    }
    void acciones.ejecutar(intencion, texto)
      .catch(() => setFallo({ tipo: 'operacion', mensaje: 'No pude completar esa orden. Intenta nuevamente.' }))
      // Si la orden terminó sin hablar, se sigue escuchando: la llamada nunca queda muda.
      .finally(() => { if (obtenerEstadoLectura().id === null) escuchar(); });
  };
  despacharRef.current = despachar;

  // ── Resultado de la consulta ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!esperando.current || enviando || !enfocada || finalizada.current || !ultimo) return;
    esperando.current = false;
    if (ultimo.error) { setFallo({ tipo: 'conexion', mensaje: MENSAJE_CONEXION }); return; }
    const respuesta = ultimo.consulta?.respuesta;
    const texto = respuesta ? textoDeRespuesta(respuesta) : '';
    if (!texto) { setFallo({ tipo: 'respuesta', mensaje: MENSAJE_SIN_RESPUESTA }); return; }
    decir(`llamada-${ultimo.id}`, texto, true);
  }, [enviando, ultimo, enfocada, decir]);

  // ── Ciclo de vida ───────────────────────────────────────────────────────────────────
  // La pantalla debe seguir encendida toda la llamada: al bloquearse, Android suspende el
  // micrófono y la red de la app. Es la misma infraestructura que usa el chat mientras espera.
  useEffect(() => {
    finalizada.current = false; // un montaje doble (StrictMode) no debe dejar la llamada "colgada"
    void activateKeepAwakeAsync(ETIQUETA_KEEP_AWAKE).catch(() => undefined);
    return () => {
      finalizada.current = true;
      detenerLectura();
      void deactivateKeepAwake(ETIQUETA_KEEP_AWAKE);
    };
  }, []);

  // Al abrirse saluda y escucha. Si la pantalla pierde el foco de verdad (otra pantalla la
  // tapa), la llamada se pausa y al volver retoma la escucha. Ya NO ocurre al abrir la
  // respuesta, las fuentes, un documento o un reporte: todo eso se abre en el panel, dentro
  // de esta misma pantalla, que por eso no pierde el foco. (Antes «Ver respuesta y fuentes»
  // navegaba a otra pantalla y esta limpieza cortaba la voz y el micrófono.)
  useFocusEffect(useCallback(() => {
    enfocadaRef.current = true;
    setEnfocada(true);
    const arranque = setTimeout(() => {
      if (finalizada.current) return;
      if (saludado.current) { escuchar(); return; }
      saludado.current = true;
      // Si llegó un archivo recibido mientras se abría, su aviso hace de saludo (no se dicen los dos).
      const inicial = anuncioInicial.current;
      anuncioInicial.current = null;
      decir('llamada-saludo', inicial ?? SALUDO, false);
    }, ESPERA_FOCO_MS);
    return () => {
      clearTimeout(arranque);
      enfocadaRef.current = false;
      setEnfocada(false);
      detenerLectura();
      cancelarDictado();
    };
  }, [escuchar, decir, cancelarDictado]));

  // Segundo plano: se calla la voz (el dictado ya se cierra solo) y al volver se retoma.
  useEffect(() => {
    const oyente = AppState.addEventListener('change', (siguiente) => {
      // El selector de archivos del sistema tapa la app a propósito: no es un abandono, y
      // subir un archivo no debe cortar la voz del asistente.
      if (seleccionandoArchivo.current) return;
      if (siguiente !== 'active') {
        if (!finalizada.current) { segundoPlano.current = true; detenerLectura(); }
      } else if (segundoPlano.current) {
        segundoPlano.current = false;
        escuchar();
      }
    });
    return () => oyente.remove();
  }, [escuchar]);

  // ── Controles ───────────────────────────────────────────────────────────────────────
  const fijarSilencio = (valor: boolean) => { silenciadoRef.current = valor; setSilenciado(valor); };
  const dictando = voz.estado === 'permiso' || voz.estado === 'escuchando' || voz.estado === 'transcribiendo';

  /**
   * Micrófono. Si la IA habla, la interrumpe y escucha; en silencio, reactiva; escuchando,
   * silencia; en reposo o tras un fallo, vuelve a escuchar.
   */
  const microfono = () => {
    if (finalizada.current) return;
    if (hablando) {
      detenerLectura();
      fijarSilencio(false);
      escuchar();
    } else if (silenciadoRef.current) {
      fijarSilencio(false);
      escuchar();
    } else if (dictando) {
      cancelarDictado();
      fijarSilencio(true);
    } else if (esperando.current || ocupado.current) {
      fijarSilencio(true); // mientras la IA piensa no hay nada que cancelar: solo se silencia
    } else {
      escuchar();
    }
  };

  /** Reintento tras un fallo: volver a escuchar, o retomar/repetir la consulta. */
  const reintentar = () => {
    const pendiente = fallo;
    setFallo(null);
    if (pendiente?.tipo === 'operacion') { acciones.reintentarOperacion(); return; }
    if (!pendiente || pendiente.tipo === 'voz') { escuchar(); return; }
    if (!ultimo) { escuchar(); return; }
    esperando.current = true;
    // Si el servidor ya tenía la consulta se retoma su seguimiento (no se corre el modelo
    // otra vez); si no llegó a aceptarla, o terminó sin respuesta, se envía de nuevo.
    if (ultimo.error && ultimo.consultaId) reintentarSeguimiento(ultimo.id);
    else void preguntar(ultimo.pregunta);
  };

  /** Corta todo: voz, micrófono, seguimiento y pantalla encendida. Luego la pantalla navega. */
  const finalizar = () => {
    finalizada.current = true;
    esperando.current = false;
    seleccionandoArchivo.current = false;
    detenerLectura();
    cancelarDictado();
    detenerConsulta();
    void deactivateKeepAwake(ETIQUETA_KEEP_AWAKE);
  };

  // ── Lo que muestra la pantalla ──────────────────────────────────────────────────────
  const errorVoz = voz.estado === 'error' && !voz.error?.informativo ? voz.error : null;
  const avisoVoz = errorVoz
    ? (ERRORES_GENERICOS.includes(errorVoz.tipo) ? MENSAJE_VOZ : errorVoz.mensaje)
    : null;
  const problema = fallo?.mensaje ?? avisoVoz;

  const estadoAvatar: EstadoAvatar = resolverEstadoAvatar({
    dictado: voz.estado, dictadoInformativo: voz.error?.informativo, hablando,
    procesando: enviando || acciones.operacion !== null, conError: fallo !== null,
  });

  // La etapa se muestra SOLO si la informó el backend (`etapa_ia`); si aún no lo hizo, un
  // texto genérico. No hay porcentajes.
  const etapaBackend = ultimo?.consulta?.etapa_ia?.replace(/\.\.\.$/, '…') ?? null;
  const titulo =
    problema ? problema
    : voz.estado === 'escuchando' ? 'Te escucho…'
    : voz.estado === 'permiso' ? 'Solicitando permiso del micrófono…'
    : voz.estado === 'transcribiendo' ? 'Transcribiendo…'
    : enviando ? (ultimo?.reconectando ? 'Reconectando con el servidor…' : etapaBackend ?? 'Analizando tu consulta…')
    : acciones.operacion ? acciones.operacion.texto
    : hablando ? 'Respondiendo…'
    : lecturaFallida ? MENSAJE_SIN_VOZ_TTS
    : silenciado ? 'Micrófono silenciado'
    : 'Toca el micrófono para hablar';

  const modoMicrofono: ModoMicrofono =
    hablando ? 'interrumpir' : silenciado ? 'silenciado'
    : (dictando || enviando || acciones.operacion !== null) ? 'activo' : 'hablar';

  const respuestaLista = ultimo?.consulta?.respuesta && !enviando ? ultimo.consultaId : null;

  return {
    estadoAvatar, titulo, modoMicrofono,
    transcripcion: voz.parcial || transcripcion,
    /** Solo mientras se espera la respuesta: para el reloj real de espera. */
    espera: enviando && ultimo ? { iniciadoEn: ultimo.iniciadoEn }
      : acciones.operacion ? { iniciadoEn: acciones.operacion.iniciadoEn } : null,
    /** Hay un fallo del que se puede reintentar (dictado reintentable o consulta). */
    puedeReintentar: fallo !== null || (errorVoz?.reintentable ?? false),
    lecturaFallida,
    /** Id de la última consulta respondida, para abrir su detalle y fuentes a pedido. */
    consultaId: respuestaLista,
    documento: asistente.documento,
    microfono, reintentar, finalizar,
    continuar: escuchar,
    /** El panel deslizable: qué muestra y cuánto ocupa. Independiente de la voz. */
    panel,
    /** Resultados de la sesión (documento, análisis, comparación, generado, reporte) y sus acciones. */
    acciones,
    /** La consulta que muestra el panel «Respuesta»: la última que ya tiene respuesta. */
    consultaRespondida: ultimoRespondido?.consulta ?? null,
    /** Hay una consulta nueva en curso mientras el panel muestra la anterior. */
    consultaNuevaEnCurso: enviando,
    /** Abre «Respuesta y fuentes» EN el panel: no navega ni toca la voz. */
    verRespuesta: () => panel.abrir({ tipo: 'respuesta' }),
  };
}
