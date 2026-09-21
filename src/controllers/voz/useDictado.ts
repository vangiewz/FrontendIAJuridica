import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Linking } from 'react-native';
import {
  comprobarDictado, iniciarDictado, instalarEspanolSinConexion, pedirPermisoMicrofono, SesionDictado,
} from '../../services/voz/dictado';
import {
  MENSAJES_DICTADO, mensajeDescarga, TipoErrorDictado,
} from '../../services/voz/dictadoPuro';

/**
 * inactivo → permiso → escuchando → transcribiendo → inactivo (texto entregado)
 *                 └───────┴────────────┴──────────→ error   (se cierra → inactivo)
 *
 * La transcripción NO se envía sola: `alTexto` la entrega para que el usuario la revise
 * y la corrija en el campo antes de enviarla. Ningún fallo toca lo que ya estaba escrito
 * en el campo: solo un resultado correcto llama a `alTexto`.
 */
export type EstadoDictado =
  'inactivo' | 'permiso' | 'escuchando' | 'transcribiendo' | 'instalando' | 'error';

export interface ErrorDictado {
  tipo: TipoErrorDictado | 'informacion';
  mensaje: string;
  /** El permiso quedó denegado de forma permanente: solo se cambia desde Ajustes. */
  puedeAbrirAjustes: boolean;
  /** Tiene sentido volver a intentarlo (en Expo Go o web no lo tiene). */
  reintentable: boolean;
  /** No es un fallo: es un aviso (p. ej. el resultado de instalar el idioma). */
  informativo: boolean;
}

const NO_REINTENTABLES: TipoErrorDictado[] = ['web', 'expo_go', 'sin_modulo', 'sin_servicio', 'idioma'];
/** Si tras pedir el resultado final no llega nada, se usa lo último reconocido. */
const ESPERA_FINAL_MS = 8000;
/** Tope de una dictada: un micrófono abierto por error no debe quedar abierto. */
const ESCUCHA_MAXIMA_MS = 60000;

export function useDictado(alTexto: (texto: string) => void) {
  const [estado, setEstado] = useState<EstadoDictado>('inactivo');
  const [parcial, setParcial] = useState('');
  const [error, setError] = useState<ErrorDictado | null>(null);
  const [enDispositivo, setEnDispositivo] = useState<boolean | null>(null);
  const [puedeInstalarIdioma, setPuedeInstalarIdioma] = useState(false);
  const sesion = useRef<SesionDictado | null>(null);
  const vigente = useRef(0);
  const enCurso = useRef(false);
  const parcialRef = useRef('');
  const espera = useRef<ReturnType<typeof setTimeout> | null>(null);
  const alTextoRef = useRef(alTexto);
  alTextoRef.current = alTexto;

  const limpiarEspera = () => {
    if (espera.current) { clearTimeout(espera.current); espera.current = null; }
  };

  const fallar = useCallback((tipo: TipoErrorDictado, puedeAbrirAjustes = false) => {
    limpiarEspera();
    sesion.current = null;
    enCurso.current = false;
    setError({ tipo, mensaje: MENSAJES_DICTADO[tipo], puedeAbrirAjustes, informativo: false,
      reintentable: !NO_REINTENTABLES.includes(tipo) });
    setEstado('error');
  }, []);

  const cancelar = useCallback(() => {
    vigente.current += 1;
    limpiarEspera();
    sesion.current?.cancelar();
    sesion.current = null;
    enCurso.current = false;
    parcialRef.current = '';
    setParcial('');
    setError(null);
    setEstado('inactivo');
  }, []);

  const iniciar = useCallback(async () => {
    if (enCurso.current) return; // un doble toque no abre dos sesiones de micrófono
    const disponibilidad = comprobarDictado();
    if (!disponibilidad.disponible) { fallar(disponibilidad.motivo); return; }

    enCurso.current = true;
    const mio = ++vigente.current;
    parcialRef.current = '';
    setParcial('');
    setError(null);
    setEnDispositivo(null);
    setPuedeInstalarIdioma(false);
    setEstado('permiso');

    let permiso: { concedido: boolean; puedePreguntar: boolean };
    try { permiso = await pedirPermisoMicrofono(); } catch { fallar('desconocido'); return; }
    if (mio !== vigente.current) return;
    if (!permiso.concedido) { fallar('permiso', !permiso.puedePreguntar); return; }

    try {
      const nueva = await iniciarDictado({
        alEscuchar: () => { if (mio === vigente.current) setEstado('escuchando'); },
        alFinDeHabla: () => { if (mio === vigente.current) setEstado('transcribiendo'); },
        alParcial: (texto) => {
          if (mio !== vigente.current) return;
          parcialRef.current = texto;
          setParcial(texto);
        },
        alFinal: (texto) => {
          if (mio !== vigente.current) return;
          limpiarEspera();
          sesion.current = null;
          enCurso.current = false;
          parcialRef.current = '';
          setParcial('');
          setEstado('inactivo');
          alTextoRef.current(texto);
        },
        alError: (tipo) => { if (mio === vigente.current) fallar(tipo); },
      });
      if (mio !== vigente.current) { nueva.cancelar(); return; }
      sesion.current = nueva;
      setEnDispositivo(nueva.enDispositivo);
      setPuedeInstalarIdioma(nueva.puedeInstalarIdioma);
      setEstado((actual) => (actual === 'permiso' ? 'escuchando' : actual));
    } catch {
      if (mio === vigente.current) fallar('desconocido');
    }
  }, [fallar]);

  /** «Listo»: deja de escuchar y pide el texto final. */
  const terminar = useCallback(() => {
    const actual = sesion.current;
    if (!actual) return;
    const mio = vigente.current;
    setEstado('transcribiendo');
    actual.detener();
    limpiarEspera();
    espera.current = setTimeout(() => {
      if (mio !== vigente.current) return;
      const texto = parcialRef.current.trim();
      actual.cancelar();
      sesion.current = null;
      if (texto) {
        enCurso.current = false;
        parcialRef.current = '';
        setParcial('');
        setEstado('inactivo');
        alTextoRef.current(texto);
      } else {
        fallar('sin_voz');
      }
    }, ESPERA_FINAL_MS);
  }, [fallar]);

  /**
   * Instala el español para reconocer sin conexión. Corta la escucha en curso: el
   * diálogo de descarga es del sistema y no debe convivir con el micrófono abierto.
   */
  const instalarIdioma = useCallback(async () => {
    const mio = ++vigente.current;
    limpiarEspera();
    sesion.current?.cancelar();
    sesion.current = null;
    enCurso.current = true;
    parcialRef.current = '';
    setParcial('');
    setEstado('instalando');
    let mensaje: string;
    try {
      mensaje = mensajeDescarga(await instalarEspanolSinConexion());
    } catch {
      mensaje = mensajeDescarga('error');
    }
    if (mio !== vigente.current) return;
    enCurso.current = false;
    setError({ tipo: 'informacion', mensaje, puedeAbrirAjustes: false, reintentable: false,
      informativo: true });
    setEstado('error');
  }, []);

  const cerrarError = useCallback(() => {
    enCurso.current = false;
    setError(null);
    setEstado('inactivo');
  }, []);
  const abrirAjustes = useCallback(() => { void Linking.openSettings(); }, []);

  // Un micrófono abierto por error (o un reconocedor que no se calla) se cierra solo.
  useEffect(() => {
    if (estado !== 'escuchando') return undefined;
    const tope = setTimeout(terminar, ESCUCHA_MAXIMA_MS);
    return () => clearTimeout(tope);
  }, [estado, terminar]);

  // Si la app pasa a segundo plano, el micrófono no debe quedar abierto.
  useEffect(() => {
    const oyente = AppState.addEventListener('change', (siguiente) => {
      if (siguiente !== 'active' && sesion.current) cancelar();
    });
    return () => oyente.remove();
  }, [cancelar]);

  useEffect(() => () => {
    vigente.current += 1;
    limpiarEspera();
    sesion.current?.cancelar();
  }, []);

  return {
    estado, parcial, error, enDispositivo, puedeInstalarIdioma,
    iniciar, terminar, cancelar, cerrarError, abrirAjustes, instalarIdioma,
  };
}
