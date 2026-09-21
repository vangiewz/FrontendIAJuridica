import React, { useRef, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { CameraView } from 'expo-camera';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icono, NombreIcono } from '../shared/Icono';
import { AvatarAsistente } from '../avatar/AvatarAsistente';
import { EstadoAvatar } from '../avatar/estados';
import type { EscanerLlamada } from '../../controllers/llamada/useEscanerLlamada';
import { colores, espaciado, radios, tipografia } from '../../theme';

interface Props {
  escaner: EscanerLlamada;
  /** La llamada sigue a la vista: su avatar y su estado (por ejemplo, «Respondiendo…»). */
  estadoAvatar: EstadoAvatar;
  titulo: string;
}

/**
 * La cámara del escáner, como una CAPA dentro de la pantalla de llamada (no una ruta): la
 * llamada sigue montada debajo con su voz, su panel y su sesión. Es solo de fotos: no pide
 * audio. Mientras está abierta la ESCUCHA está en pausa, pero el asistente puede seguir
 * hablando; el avatar de arriba lo muestra.
 *
 * Todo el estado vive en `useEscanerLlamada`; aquí solo se dibuja y se toma la foto.
 */
export function EscanerCamara({ escaner, estadoAvatar, titulo }: Props) {
  const insets = useSafeAreaInsets();
  const camaraRef = useRef<CameraView>(null);
  const [lista, setLista] = useState(false);
  const [linterna, setLinterna] = useState(false);
  const [errorMontaje, setErrorMontaje] = useState<string | null>(null);
  const cam = escaner.camara;
  if (!cam) return null;

  const enClausula = cam.modo === 'clausula';
  const paginas = escaner.paginas;
  const seleccionada = paginas.find((p) => p.id === escaner.seleccionada) ?? null;
  const indiceSeleccion = seleccionada ? paginas.indexOf(seleccionada) : -1;
  const puedeCapturar = cam.permiso === 'ok' && lista && !escaner.capturando && !errorMontaje;

  const tomar = () => {
    if (!puedeCapturar) return;
    void escaner.capturar(async () => {
      const foto = await camaraRef.current?.takePictureAsync({ quality: 0.9, shutterSound: false });
      if (!foto) throw new Error('sin foto');
      return { uri: foto.uri, width: foto.width, height: foto.height };
    });
  };

  // Estado visible, sin porcentajes: solo lo que de verdad ocurre.
  const estado =
    cam.permiso === 'verificando' ? 'Preparando la cámara…'
    : cam.permiso !== 'ok' ? null
    : errorMontaje ? null
    : !lista ? 'Preparando la cámara…'
    : escaner.capturando ? 'Procesando la imagen…'
    : escaner.reemplazando ? `La próxima foto reemplaza la página ${paginas.findIndex((p) => p.id === escaner.reemplazando) + 1}`
    : enClausula ? 'Encuadra la cláusula y toma la foto'
    : paginas.length === 0 ? 'Página 1 · encuadra el documento'
    : `${paginas.length} ${paginas.length === 1 ? 'página capturada' : 'páginas capturadas'} · página ${paginas.length + 1}`;

  return (
    <View style={[styles.raiz, { paddingTop: insets.top + espaciado.s, paddingBottom: Math.max(insets.bottom, espaciado.s) }]}>
      {/* La llamada sigue activa: su avatar y su estado no desaparecen. */}
      <View style={styles.barraSuperior}>
        <AvatarAsistente estado={estadoAvatar} tamano={40} />
        <Text style={styles.llamada} numberOfLines={1}>{`Llamada activa · ${titulo}`}</Text>
        {cam.permiso === 'ok' ? (
          <Pressable onPress={() => setLinterna((v) => !v)} accessibilityRole="button"
            accessibilityLabel={linterna ? 'Apagar la luz' : 'Encender la luz'} style={styles.iconoBoton}>
            <Icono nombre={linterna ? 'flash' : 'flash-outline'} tamano={22} color="#FFFFFF" />
          </Pressable>
        ) : null}
      </View>

      <View style={styles.visor}>
        {cam.permiso === 'ok' && !errorMontaje ? (
          <>
            <CameraView ref={camaraRef} style={StyleSheet.absoluteFill} facing="back" enableTorch={linterna}
              onCameraReady={() => setLista(true)}
              onMountError={() => setErrorMontaje('La cámara no está disponible en este dispositivo.')} />
            <View pointerEvents="none" style={[styles.guia, enClausula && styles.guiaClausula]} />
          </>
        ) : (
          <SinCamara permiso={cam.permiso} errorMontaje={errorMontaje}
            alReintentar={() => { setErrorMontaje(null); setLista(false); void escaner.reintentarPermiso(); }}
            alAjustes={escaner.abrirAjustes} />
        )}
        {estado ? (
          <View style={styles.estado} pointerEvents="none"><Text style={styles.estadoTexto}>{estado}</Text></View>
        ) : null}
        {escaner.aviso ? (
          <View style={styles.aviso}><Text style={styles.avisoTexto}>{escaner.aviso}</Text></View>
        ) : null}
      </View>

      {!enClausula && paginas.length > 0 ? (
        <View style={styles.tiraContenedor}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tira}>
            {paginas.map((p, i) => (
              <Pressable key={p.id} onPress={() => escaner.seleccionar(p.id)} accessibilityRole="button"
                accessibilityLabel={`Página ${i + 1}`}
                style={[styles.miniatura, p.id === escaner.seleccionada && styles.miniaturaActiva]}>
                <Image source={{ uri: p.uri }} style={styles.miniaturaImagen} resizeMode="cover" />
                <Text style={styles.miniaturaNumero}>{i + 1}</Text>
              </Pressable>
            ))}
          </ScrollView>
          {seleccionada ? (
            <View style={styles.edicion}>
              <Accion icono="camera-reverse-outline" texto="Repetir" activa={escaner.reemplazando === seleccionada.id}
                onPress={() => (escaner.reemplazando === seleccionada.id ? escaner.cancelarReemplazo() : escaner.repetir(seleccionada.id))} />
              <Accion icono="refresh-outline" texto="Rotar" onPress={() => { void escaner.rotar(seleccionada.id); }} />
              <Accion icono="arrow-back-outline" texto="Antes" deshabilitada={indiceSeleccion <= 0}
                onPress={() => escaner.mover(seleccionada.id, -1)} />
              <Accion icono="arrow-forward-outline" texto="Después" deshabilitada={indiceSeleccion >= paginas.length - 1}
                onPress={() => escaner.mover(seleccionada.id, 1)} />
              <Accion icono="trash-outline" texto="Eliminar" peligro onPress={() => escaner.eliminar(seleccionada.id)} />
            </View>
          ) : (
            <Text style={styles.pista}>Toca una miniatura para repetirla, rotarla, moverla o eliminarla.</Text>
          )}
        </View>
      ) : null}

      <View style={styles.barraInferior}>
        <Pressable onPress={escaner.solicitarCancelar} accessibilityRole="button" style={styles.lateral}>
          <Text style={styles.lateralTexto}>Cancelar</Text>
        </Pressable>
        <Pressable onPress={tomar} disabled={!puedeCapturar} accessibilityRole="button" accessibilityLabel="Capturar"
          style={[styles.disparador, !puedeCapturar && styles.disparadorInactivo]}>
          <View style={styles.disparadorInterior} />
        </Pressable>
        {enClausula ? (
          <View style={styles.lateral} />
        ) : (
          <Pressable onPress={() => { void escaner.terminar(); }} disabled={paginas.length === 0 || escaner.capturando}
            accessibilityRole="button" style={styles.lateral}>
            <Text style={[styles.lateralTexto, (paginas.length === 0 || escaner.capturando) && styles.lateralInactivo]}>
              {paginas.length > 0 ? `Finalizar (${paginas.length})` : 'Finalizar'}
            </Text>
          </Pressable>
        )}
      </View>

      {escaner.confirmandoCancelar ? (
        <View style={styles.confirmacion}>
          <View style={styles.confirmacionCaja}>
            <Text style={styles.confirmacionTitulo}>
              {`¿Descartar ${paginas.length} ${paginas.length === 1 ? 'página' : 'páginas'}?`}
            </Text>
            <Text style={styles.confirmacionTexto}>Se perderán las fotos que ya tomaste.</Text>
            <View style={styles.confirmacionBotones}>
              <Pressable onPress={escaner.seguirEscaneando} accessibilityRole="button" style={styles.seguir}>
                <Text style={styles.seguirTexto}>Seguir escaneando</Text>
              </Pressable>
              <Pressable onPress={escaner.cancelar} accessibilityRole="button" style={styles.descartar}>
                <Text style={styles.descartarTexto}>Descartar</Text>
              </Pressable>
            </View>
          </View>
        </View>
      ) : null}
    </View>
  );
}

function Accion({ icono, texto, onPress, activa, deshabilitada, peligro }: {
  icono: NombreIcono; texto: string; onPress: () => void; activa?: boolean; deshabilitada?: boolean; peligro?: boolean;
}) {
  return (
    <Pressable onPress={onPress} disabled={deshabilitada} accessibilityRole="button" accessibilityLabel={texto}
      style={[styles.accion, activa && styles.accionActiva, deshabilitada && styles.accionInactiva]}>
      <Icono nombre={icono} tamano={20} color={peligro ? '#FF8A8A' : '#FFFFFF'} />
      <Text style={[styles.accionTexto, peligro && styles.accionPeligro]}>{texto}</Text>
    </Pressable>
  );
}

function SinCamara({ permiso, errorMontaje, alReintentar, alAjustes }: {
  permiso: string; errorMontaje: string | null; alReintentar: () => void; alAjustes: () => void;
}) {
  if (permiso === 'verificando' && !errorMontaje) return null;
  const mensaje = errorMontaje
    ?? (permiso === 'no_disponible' ? 'La cámara no está disponible en este dispositivo.' : 'No tengo permiso para usar la cámara.');
  return (
    <View style={styles.sinCamara}>
      <Icono nombre="camera-outline" tamano={40} color="#FFFFFF" />
      <Text style={styles.sinCamaraTexto}>{mensaje}</Text>
      <Pressable onPress={alReintentar} accessibilityRole="button" style={styles.sinCamaraBoton}>
        <Text style={styles.sinCamaraBotonTexto}>Intentar nuevamente</Text>
      </Pressable>
      {permiso === 'denegado_definitivo' ? (
        <Pressable onPress={alAjustes} accessibilityRole="button" style={styles.sinCamaraSecundario}>
          <Text style={styles.sinCamaraSecundarioTexto}>Abrir configuración</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  raiz: { ...StyleSheet.absoluteFill, zIndex: 20, elevation: 20, backgroundColor: '#000000', paddingHorizontal: espaciado.m },
  barraSuperior: { flexDirection: 'row', alignItems: 'center', gap: espaciado.s, minHeight: 44, marginBottom: espaciado.s },
  llamada: { flex: 1, fontFamily: tipografia.familias.cuerpo, fontSize: tipografia.escala.nota, color: '#E8E8E8' },
  iconoBoton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  visor: { flex: 1, borderRadius: radios.m, overflow: 'hidden', backgroundColor: '#111111', justifyContent: 'center' },
  guia: {
    position: 'absolute', top: '6%', bottom: '6%', left: '8%', right: '8%', borderRadius: radios.s,
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.7)', borderStyle: 'dashed',
  },
  guiaClausula: { top: '30%', bottom: '30%' },
  estado: { position: 'absolute', bottom: espaciado.s, left: 0, right: 0, alignItems: 'center' },
  estadoTexto: {
    fontFamily: tipografia.familias.cuerpoFuerte, fontSize: tipografia.escala.nota, color: '#FFFFFF',
    backgroundColor: 'rgba(0,0,0,0.65)', paddingHorizontal: espaciado.m, paddingVertical: espaciado.xs, borderRadius: radios.round,
    overflow: 'hidden',
  },
  aviso: { position: 'absolute', top: espaciado.s, left: espaciado.m, right: espaciado.m, alignItems: 'center' },
  avisoTexto: {
    fontFamily: tipografia.familias.cuerpoFuerte, fontSize: tipografia.escala.nota, color: '#FFFFFF',
    backgroundColor: colores.alerta, paddingHorizontal: espaciado.m, paddingVertical: espaciado.xs, borderRadius: radios.s, overflow: 'hidden',
  },
  tiraContenedor: { paddingTop: espaciado.s, gap: espaciado.xs },
  tira: { gap: espaciado.s, paddingVertical: 2 },
  miniatura: { width: 54, height: 72, borderRadius: radios.s, overflow: 'hidden', borderWidth: 2, borderColor: 'transparent' },
  miniaturaActiva: { borderColor: colores.destacado },
  miniaturaImagen: { width: '100%', height: '100%' },
  miniaturaNumero: {
    position: 'absolute', bottom: 2, right: 4, fontFamily: tipografia.familias.cuerpoFuerte, fontSize: 12, color: '#FFFFFF',
    backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 4, borderRadius: 4, overflow: 'hidden',
  },
  edicion: { flexDirection: 'row', justifyContent: 'space-between' },
  accion: { alignItems: 'center', justifyContent: 'center', minWidth: 58, minHeight: 44, borderRadius: radios.s, paddingHorizontal: 4 },
  accionActiva: { backgroundColor: 'rgba(232,163,61,0.35)' },
  accionInactiva: { opacity: 0.35 },
  accionTexto: { fontFamily: tipografia.familias.cuerpo, fontSize: 12, color: '#FFFFFF', marginTop: 2 },
  accionPeligro: { color: '#FF8A8A' },
  pista: { fontFamily: tipografia.familias.cuerpo, fontSize: 12, color: '#BDBDBD' },
  barraInferior: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: espaciado.s },
  lateral: { width: 110, minHeight: 48, justifyContent: 'center' },
  lateralTexto: { fontFamily: tipografia.familias.cuerpoFuerte, fontSize: tipografia.escala.cuerpo, color: '#FFFFFF', textAlign: 'center' },
  lateralInactivo: { opacity: 0.4 },
  disparador: {
    width: 76, height: 76, borderRadius: 38, borderWidth: 4, borderColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center',
  },
  disparadorInactivo: { opacity: 0.4 },
  disparadorInterior: { width: 58, height: 58, borderRadius: 29, backgroundColor: '#FFFFFF' },
  sinCamara: { alignItems: 'center', gap: espaciado.m, padding: espaciado.l },
  sinCamaraTexto: { fontFamily: tipografia.familias.cuerpoFuerte, fontSize: tipografia.escala.cuerpo, color: '#FFFFFF', textAlign: 'center' },
  sinCamaraBoton: { minHeight: 48, paddingHorizontal: espaciado.l, justifyContent: 'center', borderRadius: radios.m, backgroundColor: colores.accion },
  sinCamaraBotonTexto: { fontFamily: tipografia.familias.cuerpoFuerte, fontSize: tipografia.escala.cuerpo, color: colores.accionTexto },
  sinCamaraSecundario: { minHeight: 44, paddingHorizontal: espaciado.l, justifyContent: 'center', borderRadius: radios.m, borderWidth: 1, borderColor: '#FFFFFF' },
  sinCamaraSecundarioTexto: { fontFamily: tipografia.familias.cuerpoFuerte, fontSize: tipografia.escala.cuerpo, color: '#FFFFFF' },
  confirmacion: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.7)', alignItems: 'center', justifyContent: 'center', padding: espaciado.l },
  confirmacionCaja: { width: '100%', maxWidth: 380, backgroundColor: colores.superficie, borderRadius: radios.l, padding: espaciado.l, gap: espaciado.s },
  confirmacionTitulo: { fontFamily: tipografia.familias.titulo, fontSize: tipografia.escala.subtitulo, color: colores.tinta },
  confirmacionTexto: { fontFamily: tipografia.familias.cuerpo, fontSize: tipografia.escala.cuerpo, color: colores.tintaSuave },
  confirmacionBotones: { flexDirection: 'row', gap: espaciado.s, marginTop: espaciado.s },
  seguir: { flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: radios.m, backgroundColor: colores.accion },
  seguirTexto: { fontFamily: tipografia.familias.cuerpoFuerte, fontSize: tipografia.escala.nota, color: colores.accionTexto },
  descartar: { flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: radios.m, borderWidth: 1, borderColor: colores.alerta },
  descartarTexto: { fontFamily: tipografia.familias.cuerpoFuerte, fontSize: tipografia.escala.nota, color: colores.alerta },
});
