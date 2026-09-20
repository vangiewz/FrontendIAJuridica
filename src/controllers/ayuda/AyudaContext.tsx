import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname } from 'expo-router';
import {
  CatalogoAyuda, MensajeAyuda, PantallaAyuda, TipoDocumentoAyuda, TurnoAyuda,
} from '../../models/ayuda';
import { obtenerCatalogoAyuda, preguntarAyuda } from '../../services/ayuda';
import { useSesion } from '../auth/useSesion';

function pantallaDeRuta(ruta: string): PantallaAyuda {
  const partes = ruta.split('/').filter((p) => p && !p.startsWith('('));
  const actual = partes.at(-1) ?? '';
  if (actual === '' || actual === 'index' || actual === 'consulta' || actual === 'articulo') return 'asistente';
  if (actual === 'generar' || actual === 'documento-generado') return 'generar';
  if (actual === 'reportes') return 'reportes';
  if (actual === 'documentos' || actual === 'documento') return 'documentos';
  if (actual === 'comparar' || actual === 'comparacion') return 'comparaciones';
  if (actual === 'historial') return 'historial';
  return 'general';
}

interface AyudaValor {
  pantalla: PantallaAyuda;
  catalogo: CatalogoAyuda | null;
  tipoDocumento: TipoDocumentoAyuda | null;
  establecerTipoDocumento: (tipo: TipoDocumentoAyuda | null) => void;
  establecerModoReporte: (modo: 'ia' | 'visual') => void;
  elemento: string | null;
  visible: boolean;
  mensajes: MensajeAyuda[];
  enviando: boolean;
  abrirAyuda: (opciones?: { elemento?: string }) => void;
  cerrarAyuda: () => void;
  enviarAyuda: (texto: string) => Promise<boolean>;
}

const Contexto = createContext<AyudaValor | null>(null);

export function AyudaProvider({ children }: { children: React.ReactNode }) {
  const ruta = usePathname();
  const pantalla = useMemo(() => pantallaDeRuta(ruta), [ruta]);
  const { usuario } = useSesion();
  const [tipoDocumento, establecerTipoDocumento] = useState<TipoDocumentoAyuda | null>(null);
  const [modoReporte, establecerModoReporte] = useState<'ia' | 'visual'>('ia');
  const [catalogo, setCatalogo] = useState<CatalogoAyuda | null>(null);
  const [elemento, setElemento] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);
  const [mensajes, setMensajes] = useState<MensajeAyuda[]>([]);
  const [enviando, setEnviando] = useState(false);
  const ocupado = useRef(false);
  const pantallaActual = useRef(pantalla);
  pantallaActual.current = pantalla;

  useEffect(() => {
    setElemento(null);
    setMensajes([]);
  }, [pantalla]);
  useEffect(() => {
    if (!usuario) return;
    let vigente = true;
    setCatalogo(null);
    obtenerCatalogoAyuda(pantalla, tipoDocumento)
      .then((datos) => { if (vigente) setCatalogo(datos); })
      .catch(() => { if (vigente) setCatalogo(null); });
    return () => { vigente = false; };
  }, [usuario, pantalla, tipoDocumento]);

  const abrirAyuda = useCallback((opciones?: { elemento?: string }) => {
    setElemento(opciones?.elemento ?? null);
    setVisible(true);
  }, []);

  const enviarAyuda = useCallback(async (texto: string): Promise<boolean> => {
    const pregunta = texto.trim();
    if (pregunta.length < 3 || ocupado.current) return false;
    ocupado.current = true;
    setEnviando(true);
    setMensajes((previos) => [...previos, {
      id: `u-${Date.now()}-${previos.length}`, rol: 'usuario', texto: pregunta,
    }]);
    const historial: TurnoAyuda[] = [];
    for (let i = 0; i < mensajes.length - 1; i += 1) {
      if (mensajes[i].rol === 'usuario' && mensajes[i + 1].rol === 'ayuda') {
        historial.push({ pregunta: mensajes[i].texto.slice(0, 300), respuesta: mensajes[i + 1].texto.slice(0, 500) });
      }
    }
    try {
      const respuesta = await preguntarAyuda({
        pregunta, pantalla, elemento,
        tipo_documento: pantalla === 'generar' ? tipoDocumento : null,
        modo_reporte: pantalla === 'reportes' ? modoReporte : null,
        historial: historial.slice(-2),
      });
      if (pantallaActual.current !== pantalla) return true;
      setMensajes((previos) => [...previos, {
        id: `a-${Date.now()}-${previos.length}`, rol: 'ayuda',
        texto: respuesta.respuesta, respuesta,
      }]);
      setElemento(respuesta.elemento_relacionado);
    } catch (error: any) {
      if (pantallaActual.current !== pantalla) return true;
      setMensajes((previos) => [...previos, {
        id: `e-${Date.now()}-${previos.length}`, rol: 'ayuda',
        texto: error?.mensaje || 'No pude responder ahora. Intentá de nuevo.',
      }]);
    } finally {
      ocupado.current = false;
      setEnviando(false);
    }
    return true;
  }, [pantalla, elemento, tipoDocumento, modoReporte, mensajes]);

  return <Contexto.Provider value={{ pantalla, catalogo, tipoDocumento,
    establecerTipoDocumento, establecerModoReporte, elemento, visible, mensajes, enviando,
    abrirAyuda, cerrarAyuda: () => setVisible(false), enviarAyuda }}>
    {children}
  </Contexto.Provider>;
}

export function useAyuda(): AyudaValor {
  const valor = useContext(Contexto);
  if (!valor) throw new Error('useAyuda requiere AyudaProvider');
  return valor;
}
