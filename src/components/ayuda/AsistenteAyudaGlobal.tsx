import React, { useRef, useState } from 'react';
import {
  ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView,
  StyleSheet, Text, TextInput, View, useWindowDimensions,
} from 'react-native';
import { Href, usePathname, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAyuda } from '../../controllers/ayuda/AyudaContext';
import { useSesion } from '../../controllers/auth/useSesion';
import { DestinoAyuda } from '../../models/ayuda';
import { Icono } from '../shared/Icono';
import { colores, espaciado, radios, tipografia } from '../../theme';

const RUTAS: Record<DestinoAyuda, Href> = {
  asistente: '/(app)/(tabs)/',
  documentos: '/(app)/(tabs)/documentos',
  generar: '/(app)/(tabs)/generar',
  reportes: '/(app)/(tabs)/reportes',
  historial: '/(app)/(tabs)/historial',
  comparaciones: '/(app)/(tabs)/comparar',
};

const TITULOS: Record<DestinoAyuda, string> = {
  asistente: 'Asistente jurídico', documentos: 'Documentos', generar: 'Generar',
  reportes: 'Reportes', historial: 'Historial', comparaciones: 'Comparar',
};

export function AsistenteAyudaGlobal() {
  const { usuario } = useSesion();
  const { visible, abrirAyuda, cerrarAyuda, pantalla } = useAyuda();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  if (!usuario) return null;

  const bottom = (pantalla === 'asistente' ? 148 : 78) + (Platform.OS === 'web' ? 0 : insets.bottom);
  return <>
    {!visible ? (
      <Pressable onPress={() => abrirAyuda()} style={[styles.burbuja, { bottom }]}
        accessibilityRole="button" accessibilityLabel="Abrir ayuda de la aplicación"
        accessibilityHint="Abre un chat para saber cómo usar esta pantalla">
        <Icono nombre="chatbubble-ellipses-outline" tamano={25} color={colores.accionTexto} />
      </Pressable>
    ) : Platform.OS === 'web' ? (
      <View style={[styles.panelWeb, {
        width: Math.min(400, width - 24), height: Math.min(590, height - 120), bottom: 80,
      }]}>
        <Panel cerrar={cerrarAyuda} />
      </View>
    ) : (
      <Modal visible transparent animationType="slide" onRequestClose={cerrarAyuda}>
        <KeyboardAvoidingView style={styles.modal} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <Pressable style={styles.fondo} onPress={cerrarAyuda} accessibilityLabel="Cerrar ayuda" />
          <View style={[styles.panelMovil, {
            height: Math.min(620, height * 0.82), paddingBottom: Math.max(insets.bottom, espaciado.s),
          }]}>
            <Panel cerrar={cerrarAyuda} />
          </View>
        </KeyboardAvoidingView>
      </Modal>
    )}
  </>;
}

function Panel({ cerrar }: { cerrar: () => void }) {
  const router = useRouter();
  const ruta = usePathname();
  const { pantalla, catalogo, elemento, mensajes, enviando, enviarAyuda } = useAyuda();
  const [texto, setTexto] = useState('');
  const scroll = useRef<ScrollView>(null);
  const campo = elemento ? catalogo?.campos[elemento] : null;
  const accion = elemento ? catalogo?.acciones[elemento] : null;
  const detalle = ruta.split('/').filter(Boolean).at(-1) ?? '';
  const titulosDetalle: Record<string, string> = {
    perfil: 'Mi perfil', administracion: 'Administración de normativa',
    consulta: 'Consulta jurídica', articulo: 'Artículo', documento: 'Documento analizado',
    comparacion: 'Comparación guardada', 'documento-generado': 'Borrador generado',
  };

  const enviar = async (pregunta = texto) => {
    const limpio = pregunta.trim();
    if (limpio.length < 3 || enviando) return;
    setTexto('');
    const aceptado = await enviarAyuda(limpio);
    if (!aceptado) setTexto(limpio);
  };
  const navegar = (destino: DestinoAyuda) => {
    cerrar();
    router.push(RUTAS[destino]);
  };

  return <View style={styles.panelInterior}>
    <View style={styles.cabecera}>
      <View style={styles.cabeceraTexto}>
        <Text style={styles.titulo}>Ayuda</Text>
        <Text style={styles.subtitulo} numberOfLines={1}>
          {titulosDetalle[detalle] ?? (catalogo?.id === pantalla ? catalogo.titulo : TITULOS[pantalla as DestinoAyuda]) ?? 'Ayuda de la aplicación'}
        </Text>
      </View>
      <Pressable onPress={cerrar} style={styles.cerrar} accessibilityRole="button"
        accessibilityLabel="Cerrar ayuda">
        <Icono nombre="close" tamano={22} color={colores.tintaSuave} />
      </Pressable>
    </View>

    {campo || accion ? <Text style={styles.pista}>
      {campo ? `¿Querés saber para qué sirve ${campo.etiqueta}?` : accion}
    </Text> : null}

    <ScrollView ref={scroll} style={styles.chat} contentContainerStyle={styles.chatContenido}
      keyboardShouldPersistTaps="handled"
      onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: true })}>
      {mensajes.length === 0 ? (
        <Text style={styles.inicio}>¿En qué puedo ayudarte con esta pantalla?</Text>
      ) : mensajes.map((mensaje) => (
        <View key={mensaje.id} style={[styles.mensaje,
          mensaje.rol === 'usuario' ? styles.mensajeUsuario : styles.mensajeAyuda]}>
          <Text style={[styles.mensajeTexto,
            mensaje.rol === 'usuario' && styles.mensajeTextoUsuario]}>{mensaje.texto}</Text>
          {mensaje.respuesta?.accion_sugerida ? (
            <Pressable style={styles.accion} accessibilityRole="button"
              onPress={() => navegar(mensaje.respuesta!.accion_sugerida!.destino)}>
              <Text style={styles.accionTexto}>
                Ir a {TITULOS[mensaje.respuesta.accion_sugerida.destino]}
              </Text>
              <Icono nombre="arrow-forward" tamano={15} color={colores.accion} />
            </Pressable>
          ) : null}
        </View>
      ))}
      {enviando ? <View style={styles.pensando}>
        <ActivityIndicator size="small" color={colores.accion} />
        <Text style={styles.pensandoTexto}>Pensando...</Text>
      </View> : null}
      {mensajes.length === 0 && catalogo?.sugerencias.length ? (
        <View style={styles.sugerencias}>
          <Text style={styles.sugerenciasTitulo}>Preguntas sugeridas</Text>
          {catalogo.sugerencias.map((pregunta) => (
            <Pressable key={pregunta} onPress={() => void enviar(pregunta)}
              disabled={enviando} style={styles.sugerencia} accessibilityRole="button">
              <Text style={styles.sugerenciaTexto}>{pregunta}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </ScrollView>

    <View style={styles.compositor}>
      <TextInput value={texto} onChangeText={setTexto} style={styles.input} multiline
        placeholder="Escribí tu duda..." placeholderTextColor={colores.tintaSuave}
        accessibilityLabel="Escribí tu duda"
        onKeyPress={(evento) => {
          const tecla = evento.nativeEvent as typeof evento.nativeEvent & { shiftKey?: boolean };
          if (Platform.OS === 'web' && tecla.key === 'Enter' && !tecla.shiftKey) {
            evento.preventDefault();
            void enviar();
          }
        }} />
      <Pressable onPress={() => void enviar()} disabled={enviando || texto.trim().length < 3}
        style={[styles.enviar, (enviando || texto.trim().length < 3) && styles.inactivo]}
        accessibilityRole="button" accessibilityLabel="Enviar pregunta de ayuda">
        <Icono nombre="send" tamano={18} color={colores.accionTexto} />
      </Pressable>
    </View>
  </View>;
}

const styles = StyleSheet.create({
  burbuja: { position: 'absolute', right: 18, width: 52, height: 52, borderRadius: 26,
    backgroundColor: colores.accion, alignItems: 'center', justifyContent: 'center',
    zIndex: 100, elevation: 10, shadowColor: '#000', shadowOpacity: 0.18,
    shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
  panelWeb: { position: 'absolute', right: 18, backgroundColor: colores.superficie,
    borderWidth: 1, borderColor: colores.linea, borderRadius: radios.l,
    zIndex: 101, elevation: 12, shadowColor: '#000', shadowOpacity: 0.19,
    shadowRadius: 15, shadowOffset: { width: 0, height: 6 }, overflow: 'hidden' },
  modal: { flex: 1, justifyContent: 'flex-end' },
  fondo: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0,
    backgroundColor: 'rgba(34,32,28,0.42)' },
  panelMovil: { backgroundColor: colores.superficie, borderTopLeftRadius: radios.l,
    borderTopRightRadius: radios.l, overflow: 'hidden' },
  panelInterior: { flex: 1 },
  cabecera: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: espaciado.m,
    paddingVertical: espaciado.s, borderBottomWidth: 1, borderBottomColor: colores.linea },
  cabeceraTexto: { flex: 1, minWidth: 0 },
  titulo: { color: colores.tinta, fontFamily: tipografia.familias.cuerpoFuerte,
    fontSize: tipografia.escala.cuerpo },
  subtitulo: { color: colores.tintaSuave, fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.escala.nota, marginTop: 2 },
  cerrar: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  chat: { flex: 1, backgroundColor: colores.papel },
  chatContenido: { flexGrow: 1, padding: espaciado.m, gap: espaciado.s },
  pista: { color: colores.accion, fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.escala.nota, paddingHorizontal: espaciado.m,
    paddingVertical: espaciado.s, backgroundColor: colores.superficie },
  inicio: { color: colores.tintaSuave, fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.escala.cuerpo, marginVertical: espaciado.m },
  mensaje: { maxWidth: '91%', padding: espaciado.s, borderRadius: radios.m },
  mensajeUsuario: { alignSelf: 'flex-end', backgroundColor: colores.accion },
  mensajeAyuda: { alignSelf: 'flex-start', backgroundColor: colores.superficie,
    borderWidth: 1, borderColor: colores.linea },
  mensajeTexto: { color: colores.tinta, fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.escala.nota, lineHeight: 20 },
  mensajeTextoUsuario: { color: colores.accionTexto },
  accion: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start',
    gap: espaciado.xs, marginTop: espaciado.s, minHeight: 32 },
  accionTexto: { color: colores.accion, fontFamily: tipografia.familias.cuerpoFuerte,
    fontSize: tipografia.escala.nota },
  pensando: { flexDirection: 'row', alignItems: 'center', gap: espaciado.s,
    alignSelf: 'flex-start', padding: espaciado.s },
  pensandoTexto: { color: colores.tintaSuave, fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.escala.nota },
  sugerencias: { marginTop: espaciado.m, gap: espaciado.xs },
  sugerenciasTitulo: { color: colores.tintaSuave, fontFamily: tipografia.familias.cuerpoFuerte,
    fontSize: 11 },
  sugerencia: { alignSelf: 'flex-start', borderWidth: 1, borderColor: colores.linea,
    borderRadius: radios.round, backgroundColor: colores.superficie,
    paddingHorizontal: espaciado.s, paddingVertical: espaciado.xs, minHeight: 30,
    justifyContent: 'center' },
  sugerenciaTexto: { color: colores.accion, fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.escala.nota },
  compositor: { flexDirection: 'row', alignItems: 'flex-end', gap: espaciado.s,
    padding: espaciado.s, borderTopWidth: 1, borderTopColor: colores.linea },
  input: { flex: 1, minHeight: 42, maxHeight: 100, borderWidth: 1,
    borderColor: colores.linea, borderRadius: radios.m, paddingHorizontal: espaciado.s,
    paddingVertical: espaciado.s, color: colores.tinta,
    fontFamily: tipografia.familias.cuerpo, fontSize: tipografia.escala.nota },
  enviar: { width: 42, height: 42, borderRadius: radios.round,
    backgroundColor: colores.accion, alignItems: 'center', justifyContent: 'center' },
  inactivo: { opacity: 0.45 },
});
