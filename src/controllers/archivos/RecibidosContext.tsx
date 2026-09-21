import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Linking, Platform } from 'react-native';
import * as Sharing from 'expo-sharing';
import { Directory, File, Paths } from 'expo-file-system';
import { TAMANO_MAXIMO_BYTES } from '../../models/documentos';
import { borrarArchivo } from '../../services/escaner/imagenes';
import {
  ArchivoRecibido, claveDeRecepcion, esShareRepetido, MENSAJES_RECEPCION, normalizarRecibido,
  PayloadRecibido, RecepcionFallida,
} from '../../services/archivos/tiposArchivo';

/**
 * ARCHIVOS RECIBIDOS desde otras apps (WhatsApp, Gmail, Drive, Files…) por «Compartir».
 *
 * Vive en la RAÍZ de la app, por encima de la sesión y de la navegación, por una razón: el
 * archivo puede llegar con la app cerrada, antes de que el usuario inicie sesión, y no debe
 * perderse en el arranque ni en un cambio de pantalla. Aquí solo se RECIBE y se conserva: no
 * se sube nada ni se analiza. Eso lo decide el usuario en la llamada (panel «Archivo recibido»)
 * y sigue el flujo documental de siempre.
 *
 * Cómo llega un archivo (`expo-sharing`, Android):
 *  1. Android entrega un `content://` con permiso temporal. El módulo nativo lo copia a la
 *     caché PRIVADA de la app y nos da un `file://` (no se construye ninguna ruta a mano).
 *  2. Aquí se valida (formato que el backend procesa, tamaño) y la copia se mueve a una
 *     carpeta propia por archivo (`cache/recibidos/<id>/`): sin choques de nombre entre shares
 *     y con limpieza determinista.
 *  3. El share se consume UNA vez (`clearSharedPayloads`) y se ignora si es el mismo de hace
 *     un instante (re-render, volver a primer plano, un listener repetido).
 */

interface Valor {
  recibidos: ArchivoRecibido[];
  fallidos: RecepcionFallida[];
  /** Descarta uno (recibido o fallido) y borra su copia temporal. */
  descartar: (id: string) => void;
  /** Ya se le avisó al usuario de este: no se vuelve a decir. */
  marcarAvisado: (id: string) => void;
}

const VACIO: Valor = { recibidos: [], fallidos: [], descartar: () => undefined, marcarAvisado: () => undefined };
const Contexto = createContext<Valor>(VACIO);

export const useRecibidos = () => useContext(Contexto);

const CARPETA = 'recibidos';

/**
 * Borra la copia de un recibido. Solo borra la CARPETA si es una de las nuestras
 * (`cache/recibidos/<id>`); si el archivo quedó suelto en otra parte, borra solo el archivo.
 */
function borrarCarpetaDe(uri: string) {
  try {
    const archivo = new File(uri);
    const padre = archivo.parentDirectory;
    if (padre.parentDirectory.name === CARPETA) padre.delete();
    else archivo.delete();
  } catch { borrarArchivo(uri); }
}

/** Lo que quedó de una ejecución anterior (la app se cerró antes de usarlo). */
function limpiarRecibidosViejos() {
  try {
    const carpeta = new Directory(Paths.cache, CARPETA);
    if (carpeta.exists) carpeta.delete();
  } catch { /* es caché */ }
}

let contador = 0;
const nuevoId = () => `rec-${Date.now()}-${++contador}`;

export function RecibidosProvider({ children }: { children: React.ReactNode }) {
  // La recepción es de Android. En web (y iOS, que no tiene este flujo) el contexto queda vacío.
  return Platform.OS === 'android'
    ? <ProveedorAndroid>{children}</ProveedorAndroid>
    : <Contexto.Provider value={VACIO}>{children}</Contexto.Provider>;
}

function ProveedorAndroid({ children }: { children: React.ReactNode }) {
  const [recibidos, setRecibidos] = useState<ArchivoRecibido[]>([]);
  const [fallidos, setFallidos] = useState<RecepcionFallida[]>([]);
  const vistos = useRef(new Map<string, number>());
  const recibidosRef = useRef<ArchivoRecibido[]>([]);
  recibidosRef.current = recibidos;
  const procesando = useRef(false);

  const fallar = useCallback((nombre: string | null, motivo: RecepcionFallida['motivo'], mensaje: string) => {
    setFallidos((previos) => [...previos, { id: nuevoId(), nombre, motivo, mensaje, recibidoEn: Date.now(), avisado: false }]);
  }, []);

  /** Un share pendiente: lo resuelve, lo valida y lo deja disponible. Nunca sube nada. */
  const procesar = useCallback(async () => {
    if (procesando.current) return;
    let pendientes: unknown[] = [];
    try { pendientes = Sharing.getSharedPayloads(); } catch { return; }
    if (pendientes.length === 0) return;
    procesando.current = true;
    try {
      const resueltos = await Sharing.getResolvedSharedPayloadsAsync();
      Sharing.clearSharedPayloads(); // se consume UNA vez
      for (const r of resueltos) {
        const payload: PayloadRecibido = {
          // Solo archivos ya copiados a la caché privada: nunca un http ni un content:// crudo.
          contentUri: r.contentUri && r.contentUri.startsWith('file://') ? r.contentUri : null,
          contentMimeType: r.contentMimeType ?? null,
          originalName: r.originalName ?? null,
          contentSize: r.contentSize ?? null,
        };
        if (esShareRepetido(vistos.current, claveDeRecepcion(payload), Date.now())) continue;

        const resultado = normalizarRecibido(payload);
        if (!resultado.ok) {
          if (payload.contentUri) borrarArchivo(payload.contentUri); // no se conserva lo que no se va a usar
          fallar(resultado.nombre, resultado.motivo, resultado.mensaje);
          continue;
        }
        const id = nuevoId();
        let uri = resultado.archivo.uri;
        try {
          // Una carpeta propia por archivo: dos «contrato.pdf» de chats distintos no se pisan.
          const carpeta = new Directory(Paths.cache, CARPETA, id);
          carpeta.create({ intermediates: true });
          const destino = new File(carpeta, resultado.archivo.nombre);
          await new File(uri).move(destino);
          uri = destino.uri;
        } catch { /* si no se pudo mover, se usa la copia donde quedó */ }

        // Sin tamaño informado por el proveedor: se comprueba la copia, sin leerla en memoria.
        let tamano = resultado.archivo.tamano;
        if (tamano === null) { try { tamano = new File(uri).size; } catch { /* sigue sin saberse */ } }
        if (tamano !== null && tamano > TAMANO_MAXIMO_BYTES) {
          borrarCarpetaDe(uri);
          fallar(resultado.archivo.nombre, 'tamano', MENSAJES_RECEPCION.tamano);
          continue;
        }
        const nuevo: ArchivoRecibido = { id, ...resultado.archivo, uri, tamano, recibidoEn: Date.now(), avisado: false };
        setRecibidos((previos) => [...previos, nuevo]);
      }
    } catch {
      try { Sharing.clearSharedPayloads(); } catch { /* nada más que hacer */ }
      fallar(null, 'sin_uri', MENSAJES_RECEPCION.sin_uri);
    } finally {
      procesando.current = false;
    }
  }, [fallar]);

  useEffect(() => {
    limpiarRecibidosViejos(); // ANTES de procesar: lo de una ejecución anterior ya no sirve
    void procesar();
    // Con la app abierta o en segundo plano el share llega como un nuevo intent: la app vuelve
    // a primer plano y/o expo-sharing avisa por un enlace interno. Ambos caminos son seguros
    // porque `procesar` no hace nada si no hay un share pendiente.
    const estado = AppState.addEventListener('change', (s) => { if (s === 'active') void procesar(); });
    const enlace = Linking.addEventListener('url', ({ url }) => { if (url.includes('expo-sharing')) void procesar(); });
    return () => { estado.remove(); enlace.remove(); };
  }, [procesar]);

  const descartar = useCallback((id: string) => {
    const buscado = recibidosRef.current.find((r) => r.id === id);
    if (buscado) borrarCarpetaDe(buscado.uri);
    setRecibidos((previos) => previos.filter((r) => r.id !== id));
    setFallidos((previos) => previos.filter((f) => f.id !== id));
  }, []);

  const marcarAvisado = useCallback((id: string) => {
    setRecibidos((previos) => previos.map((r) => (r.id === id ? { ...r, avisado: true } : r)));
    setFallidos((previos) => previos.map((f) => (f.id === id ? { ...f, avisado: true } : f)));
  }, []);

  const valor = useMemo(() => ({ recibidos, fallidos, descartar, marcarAvisado }), [recibidos, fallidos, descartar, marcarAvisado]);
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}
