import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView, NativeScrollEvent, NativeSyntheticEvent,
  Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { Icono } from '../../components/shared/Icono';
import { AvatarAsistente } from '../../components/avatar/AvatarAsistente';
import { resolverEstadoAvatar, TEXTO_ESTADO } from '../../components/avatar/estados';
import { AvisoServidor } from '../../components/consultas/AvisoServidor';
import { EstadoProcesando } from '../../components/consultas/EstadoProcesando';
import { RespuestaChat } from '../../components/consultas/RespuestaChat';
import { SelectorDocumento } from '../../components/consultas/SelectorDocumento';
import { PanelVoz } from '../../components/voz/PanelVoz';
import { useServidor } from '../../controllers/conexion/useServidor';
import { Intercambio, useAsistente } from '../../controllers/consultas/useAsistente';
import { useDictado } from '../../controllers/voz/useDictado';
import { useHablando } from '../../controllers/voz/useHablando';
import { detener as detenerLectura } from '../../services/voz/lectura';
import { anchos, colores, espaciado, radios, tipografia } from '../../theme';

/** El dictado y la lectura usan el motor nativo del teléfono; en web no se ofrecen. */
const VOZ = Platform.OS !== 'web';

/** El texto dictado se suma al que ya hubiera escrito, con la primera letra en mayúscula. */
const unirTexto = (previo: string, dictado: string) => {
  const nuevo = dictado.trim();
  if (!previo.trim()) return nuevo.charAt(0).toUpperCase() + nuevo.slice(1);
  return `${previo.trimEnd()} ${nuevo}`;
};

export function AsistenteView() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { documento, elegirDocumento, intercambios, enviando, preguntar, reintentar,
    limpiarConversacion } = useAsistente();
  const servidor = useServidor();
  const [texto, setTexto] = useState('');
  const [dictado, setDictado] = useState(false);
  const voz = useDictado((dictada) => {
    setTexto((previo) => unirTexto(previo, dictada));
    setDictado(true);
  });
  const [eligiendo, setEligiendo] = useState(false);
  const [lejosDelFinal, setLejosDelFinal] = useState(false);
  const scroll = useRef<ScrollView>(null);
  const cercaDelFinal = useRef(true);

  // Durante los 1-2 minutos de espera la pantalla no debe apagarse: al bloquearse el
  // teléfono Android suspende la red de la app y se perdería el seguimiento.
  useEffect(() => {
    if (!enviando) return undefined;
    void activateKeepAwakeAsync('asistente-consulta').catch(() => undefined);
    return () => { void deactivateKeepAwake('asistente-consulta'); };
  }, [enviando]);

  // Cambiar de pestaña, abrir un detalle o cerrar la pantalla corta la lectura en voz alta.
  useFocusEffect(useCallback(() => () => detenerLectura(), []));

  const irAlFinal = () => {
    cercaDelFinal.current = true;
    setLejosDelFinal(false);
    scroll.current?.scrollToEnd({ animated: true });
  };
  const alDesplazar = (evento: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = evento.nativeEvent;
    const cerca = contentSize.height - contentOffset.y - layoutMeasurement.height < 100;
    cercaDelFinal.current = cerca;
    setLejosDelFinal(!cerca);
  };
  const enviar = async () => {
    const pendiente = texto.trim();
    if (pendiente.length < 3 || enviando) return;
    detenerLectura();
    setTexto('');
    setDictado(false);
    cercaDelFinal.current = true;
    setLejosDelFinal(false);
    const aceptado = await preguntar(pendiente);
    if (!aceptado) setTexto(pendiente);
  };
  const hablar = () => {
    // La lectura en voz alta se corta: el micrófono captaría la propia respuesta.
    detenerLectura();
    void voz.iniciar();
  };
  /** Abre la llamada por voz (pantalla aparte). El documento activo la acompaña como contexto. */
  const llamar = () => {
    detenerLectura();
    const contexto = documento
      ? `?documentoId=${documento.id}&documentoNombre=${encodeURIComponent(documento.nombre_archivo)}` : '';
    router.push(`/(app)/llamada${contexto}`);
  };
  const nuevaConversacion = () => {
    detenerLectura();
    limpiarConversacion();
    setTexto('');
    setDictado(false);
  };

  const bloqueado = enviando || texto.trim().length < 3;

  // El avatar refleja estados REALES: el dictado, la consulta en curso y la lectura en voz alta.
  const hablando = useHablando();
  const servidorCaido = servidor.estado === 'caido';
  const estadoAvatar = resolverEstadoAvatar({
    dictado: voz.estado, dictadoInformativo: voz.error?.informativo, hablando, procesando: enviando,
    conError: servidorCaido || intercambios[intercambios.length - 1]?.error != null,
  });
  const subtitulo = estadoAvatar === 'error'
    ? (servidorCaido ? 'Sin conexión con el servidor' : 'Hubo un problema con la última consulta')
    : TEXTO_ESTADO[estadoAvatar] ?? 'Consultas sobre normativa y tus documentos';

  return (
    // 'padding' también en Android: con la pantalla de borde a borde el sistema ya no
    // reduce la ventana al abrir el teclado y, sin esto, este taparía el campo de texto.
    <KeyboardAvoidingView style={styles.raiz} behavior={Platform.OS === 'web' ? undefined : 'padding'}>
      <View style={[styles.cabecera, { paddingTop: Math.max(insets.top, espaciado.s) }]}>
        <View style={styles.ancho}>
          <View style={styles.cabeceraFila}>
            <AvatarAsistente estado={estadoAvatar} tamano={48} style={styles.avatar} />
            <View style={styles.cabeceraTexto}>
              <Text style={styles.titulo}>Asistente jurídico</Text>
              <Text style={styles.subtitulo} numberOfLines={1} accessibilityLiveRegion="polite">
                {subtitulo}
              </Text>
            </View>
            {VOZ ? (
              <Pressable onPress={llamar} accessibilityRole="button"
                accessibilityLabel="Llamar al asistente por voz" style={styles.nueva}>
                <Icono nombre="call-outline" tamano={20} color={colores.accion} />
              </Pressable>
            ) : null}
            {intercambios.length > 0 ? (
              <Pressable onPress={nuevaConversacion}
                accessibilityRole="button" accessibilityLabel="Nueva conversación" style={styles.nueva}>
                <Icono nombre="create-outline" tamano={20} color={colores.accion} />
              </Pressable>
            ) : null}
          </View>
          {servidor.estado === 'caido' ? (
            <AvisoServidor comprobando={servidor.comprobando} onReintentar={() => void servidor.comprobar()} />
          ) : null}
          {documento ? (
            <View style={styles.documento}>
              <Icono nombre="document-text-outline" tamano={20} color={colores.accion} />
              <View style={styles.documentoInfo}>
                <Text style={styles.documentoEtiqueta}>Documento activo</Text>
                <Text style={styles.documentoNombre} numberOfLines={1}>{documento.nombre_archivo}</Text>
              </View>
              <Accion icono="open-outline" etiqueta="Ver documento"
                onPress={() => router.push(`/(app)/documento?id=${documento.id}`)} />
              <Accion icono="swap-horizontal-outline" etiqueta="Cambiar documento"
                onPress={() => setEligiendo(true)} />
              <Accion icono="close" etiqueta="Quitar documento"
                onPress={() => elegirDocumento(null)} />
            </View>
          ) : null}
        </View>
      </View>

      <ScrollView ref={scroll} style={styles.mensajes} contentContainerStyle={styles.mensajesContenido}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        onScroll={alDesplazar} scrollEventThrottle={100}
        onContentSizeChange={() => { if (cercaDelFinal.current) scroll.current?.scrollToEnd({ animated: true }); }}>
        <View style={styles.ancho}>
          {intercambios.length === 0 ? (
            <View style={styles.vacio}>
              <Icono nombre="chatbubbles-outline" tamano={34} color={colores.accion} />
              <Text style={styles.vacioTitulo}>¿En qué puedo ayudarte?</Text>
              <Text style={styles.vacioTexto}>
                {VOZ ? 'Escribe tu consulta o toca el micrófono y cuéntame tu caso.'
                  : 'Pregunta sobre derecho civil o trabaja con un documento.'}
              </Text>
              <View style={styles.sugerencias}>
                {VOZ ? (
                  <Sugerencia icono="call-outline" titulo="Llamar al asistente (conversación por voz)" onPress={llamar} />
                ) : null}
                {VOZ ? (
                  <Sugerencia icono="mic-outline" titulo="Dictar mi consulta por voz" onPress={hablar} />
                ) : null}
                <Sugerencia icono="chatbubble-outline" titulo="Hacer una consulta jurídica"
                  onPress={() => setTexto('¿Qué establece el Código Civil sobre responsabilidad contractual?')} />
                <Sugerencia icono="attach-outline" titulo="Adjuntar un documento"
                  onPress={() => setEligiendo(true)} />
                <Sugerencia icono="document-text-outline" titulo="Analizar un contrato"
                  onPress={() => { setTexto('Analizá este contrato.'); if (!documento) setEligiendo(true); }} />
              </View>
            </View>
          ) : intercambios.map((intercambio) => (
            <Turno key={intercambio.id} intercambio={intercambio}
              onReintentar={() => reintentar(intercambio.id)} ocupado={enviando} />
          ))}
        </View>
      </ScrollView>

      {lejosDelFinal ? (
        <Pressable onPress={irAlFinal} style={styles.irFinal} accessibilityRole="button">
          <Icono nombre="arrow-down" tamano={16} color={colores.accion} />
          <Text style={styles.irFinalTexto}>Ir al final</Text>
        </Pressable>
      ) : null}

      <View style={styles.compositorArea}>
        {enviando && texto.trim().length > 0 ? (
          <Text style={styles.pista}>Estoy analizando tu consulta anterior; podrás enviar esta cuando termine.</Text>
        ) : dictado && texto.trim().length > 0 ? (
          <Text style={styles.pista}>Texto dictado: revísalo, corrígelo si hace falta y toca Enviar.</Text>
        ) : null}
        <View style={[styles.ancho, styles.compositor]}>
          <Pressable onPress={() => setEligiendo(true)} style={styles.adjuntar}
            accessibilityRole="button" accessibilityLabel="Adjuntar documento">
            <Icono nombre="attach-outline" tamano={24} color={colores.accion} />
          </Pressable>
          <TextInput style={styles.campo} value={texto} onChangeText={setTexto} multiline
            placeholder="Escribe tu consulta…" placeholderTextColor={colores.tintaSuave}
            maxLength={4000}
            onKeyPress={(evento) => {
              const tecla = evento.nativeEvent as typeof evento.nativeEvent & { shiftKey?: boolean };
              if (Platform.OS === 'web' && tecla.key === 'Enter' && !tecla.shiftKey) {
                evento.preventDefault();
                void enviar();
              }
            }} />
          {VOZ ? (
            <Pressable onPress={hablar} style={styles.microfono}
              accessibilityRole="button" accessibilityLabel="Dictar la consulta por voz">
              <Icono nombre="mic-outline" tamano={24} color={colores.accion} />
            </Pressable>
          ) : null}
          <Pressable onPress={() => void enviar()} disabled={bloqueado}
            style={[styles.enviar, bloqueado && styles.enviarDeshabilitado]}
            accessibilityRole="button" accessibilityLabel="Enviar mensaje">
            <Icono nombre="send" tamano={20} color={colores.accionTexto} />
          </Pressable>
        </View>
      </View>
      <SelectorDocumento visible={eligiendo} onCerrar={() => setEligiendo(false)} onElegir={elegirDocumento} />
      {VOZ ? (
        <PanelVoz estado={voz.estado} parcial={voz.parcial} error={voz.error}
          enDispositivo={voz.enDispositivo} puedeInstalarIdioma={voz.puedeInstalarIdioma}
          onInstalarIdioma={() => void voz.instalarIdioma()}
          onListo={voz.terminar} onCancelar={voz.cancelar}
          onReintentar={() => void voz.iniciar()} onCerrar={voz.cerrarError}
          onAbrirAjustes={voz.abrirAjustes} />
      ) : null}
    </KeyboardAvoidingView>
  );
}

function Turno({ intercambio, onReintentar, ocupado }: {
  intercambio: Intercambio; onReintentar: () => void; ocupado: boolean;
}) {
  const { consulta } = intercambio;
  const procesando = !consulta || consulta.estado === 'procesando';
  const tiempo = intercambio.duracionMs;
  return (
    <View style={styles.turno}>
      <View style={styles.pregunta}>
        <Text style={styles.preguntaTexto} selectable>{intercambio.pregunta}</Text>
        {intercambio.documentoNombre ? (
          <Text style={styles.preguntaDocumento}>{intercambio.documentoNombre}</Text>
        ) : null}
      </View>
      {intercambio.error ? (
        <View style={styles.errorCaja}>
          <Icono nombre="alert-circle-outline" tamano={22} color={colores.alerta} />
          <Text style={styles.error}>{intercambio.error}</Text>
          <Pressable onPress={onReintentar} disabled={ocupado} accessibilityRole="button"
            style={[styles.reintentar, ocupado && styles.enviarDeshabilitado]}>
            <Icono nombre="refresh" tamano={18} color={colores.accion} />
            <Text style={styles.reintentarTexto}>Reintentar</Text>
          </Pressable>
        </View>
      ) : procesando ? (
        <EstadoProcesando etapa={intercambio.etapa} iniciadoEn={intercambio.iniciadoEn}
          reconectando={intercambio.reconectando} />
      ) : consulta?.respuesta ? (
        <>
          <RespuestaChat respuesta={consulta.respuesta} documentoId={consulta.documento_id}
            lecturaId={VOZ ? intercambio.id : undefined} />
          {tiempo !== null ? (
            <Text style={styles.tiempo}>{tiempo < 1000 ? '< 1 s' : `${(tiempo / 1000).toFixed(1).replace('.', ',')} s`}</Text>
          ) : null}
        </>
      ) : <Text style={styles.error}>{consulta?.ia_error ?? 'No se pudo generar la respuesta.'}</Text>}
    </View>
  );
}

function Accion({ icono, etiqueta, onPress }: {
  icono: React.ComponentProps<typeof Icono>['nombre']; etiqueta: string; onPress: () => void;
}) {
  return <Pressable onPress={onPress} style={styles.accion} accessibilityRole="button"
    accessibilityLabel={etiqueta}><Icono nombre={icono} tamano={18} color={colores.accion} /></Pressable>;
}

function Sugerencia({ icono, titulo, onPress }: {
  icono: React.ComponentProps<typeof Icono>['nombre']; titulo: string; onPress: () => void;
}) {
  return <Pressable onPress={onPress} style={styles.sugerencia} accessibilityRole="button">
    <Icono nombre={icono} tamano={18} color={colores.accion} />
    <Text style={styles.sugerenciaTexto}>{titulo}</Text>
    <Icono nombre="chevron-forward" tamano={16} color={colores.tintaSuave} />
  </Pressable>;
}

const styles = StyleSheet.create({
  raiz: { flex: 1, backgroundColor: colores.papel },
  ancho: { width: '100%', maxWidth: anchos.lectura, alignSelf: 'center' },
  cabecera: { backgroundColor: colores.superficie, borderBottomWidth: 1,
    borderBottomColor: colores.linea, paddingHorizontal: espaciado.m, paddingBottom: espaciado.s },
  cabeceraFila: { flexDirection: 'row', alignItems: 'center' },
  cabeceraTexto: { flex: 1 },
  avatar: { marginRight: espaciado.s },
  titulo: { fontFamily: tipografia.familias.titulo, fontSize: tipografia.escala.subtitulo,
    color: colores.tinta },
  subtitulo: { fontFamily: tipografia.familias.cuerpo, fontSize: tipografia.escala.nota,
    color: colores.tintaSuave, marginTop: 2 },
  nueva: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  documento: { flexDirection: 'row', alignItems: 'center', gap: espaciado.xs,
    marginTop: espaciado.s, backgroundColor: colores.papel, borderRadius: radios.m,
    paddingHorizontal: espaciado.s, minHeight: 48 },
  documentoInfo: { flex: 1, minWidth: 0, marginLeft: espaciado.xs },
  documentoEtiqueta: { fontFamily: tipografia.familias.cuerpo, fontSize: 11,
    color: colores.tintaSuave },
  documentoNombre: { fontFamily: tipografia.familias.cuerpoFuerte, fontSize: tipografia.escala.nota,
    color: colores.tinta },
  accion: { width: 40, height: 44, alignItems: 'center', justifyContent: 'center' },
  mensajes: { flex: 1 },
  mensajesContenido: { flexGrow: 1, paddingHorizontal: espaciado.m, paddingVertical: espaciado.l },
  vacio: { flex: 1, minHeight: 330, justifyContent: 'center', alignItems: 'center' },
  vacioTitulo: { fontFamily: tipografia.familias.titulo, fontSize: tipografia.escala.subtitulo,
    color: colores.tinta, marginTop: espaciado.m, textAlign: 'center' },
  vacioTexto: { fontFamily: tipografia.familias.cuerpo, fontSize: tipografia.escala.nota,
    color: colores.tintaSuave, marginTop: espaciado.xs, textAlign: 'center' },
  sugerencias: { width: '100%', maxWidth: 370, gap: espaciado.s, marginTop: espaciado.l },
  sugerencia: { flexDirection: 'row', alignItems: 'center', gap: espaciado.s,
    minHeight: 52, padding: espaciado.m, backgroundColor: colores.superficie, borderWidth: 1,
    borderColor: colores.linea, borderRadius: radios.m },
  sugerenciaTexto: { flex: 1, fontFamily: tipografia.familias.cuerpoFuerte,
    fontSize: tipografia.escala.nota, color: colores.tinta },
  turno: { marginBottom: espaciado.l },
  pregunta: { alignSelf: 'flex-end', maxWidth: '88%', backgroundColor: colores.accion,
    borderRadius: radios.l, paddingHorizontal: espaciado.m, paddingVertical: espaciado.s },
  preguntaTexto: { color: colores.accionTexto, fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.escala.cuerpo, lineHeight: 23 },
  preguntaDocumento: { color: colores.accionTexto, opacity: 0.8,
    fontFamily: tipografia.familias.cuerpo, fontSize: tipografia.escala.nota, marginTop: 3 },
  errorCaja: { alignSelf: 'stretch', marginTop: espaciado.m, padding: espaciado.m, gap: espaciado.s,
    backgroundColor: '#FDECEE', borderRadius: radios.m },
  error: { color: colores.tinta, fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.escala.cuerpo, lineHeight: 23 },
  reintentar: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center',
    gap: espaciado.xs, minHeight: 44, paddingHorizontal: espaciado.m, borderRadius: radios.round,
    borderWidth: 1, borderColor: colores.accion, backgroundColor: colores.superficie },
  reintentarTexto: { color: colores.accion, fontFamily: tipografia.familias.cuerpoFuerte,
    fontSize: tipografia.escala.nota },
  tiempo: { alignSelf: 'flex-end', color: colores.tintaSuave, fontFamily: tipografia.familias.cuerpo,
    fontSize: 11, marginTop: espaciado.xs, marginRight: espaciado.xs },
  irFinal: { position: 'absolute', bottom: 100, alignSelf: 'center', flexDirection: 'row',
    alignItems: 'center', gap: espaciado.xs, paddingHorizontal: espaciado.m,
    minHeight: 38, backgroundColor: colores.superficie, borderWidth: 1,
    borderColor: colores.linea, borderRadius: radios.round },
  irFinalTexto: { color: colores.accion, fontFamily: tipografia.familias.cuerpoFuerte,
    fontSize: tipografia.escala.nota },
  // Sin margen inferior de seguridad: el compositor queda sobre la barra de pestañas, que
  // ya lo aplica; sumarlo aquí dejaba un hueco vacío en los teléfonos con gestos.
  compositorArea: { backgroundColor: colores.superficie, borderTopWidth: 1,
    borderTopColor: colores.linea, paddingHorizontal: espaciado.m, paddingTop: espaciado.s,
    paddingBottom: espaciado.s },
  pista: { color: colores.tintaSuave, fontFamily: tipografia.familias.cuerpo, fontSize: 12,
    lineHeight: 16, marginBottom: espaciado.xs },
  compositor: { flexDirection: 'row', alignItems: 'flex-end', gap: espaciado.xs },
  adjuntar: { width: 40, height: 48, alignItems: 'center', justifyContent: 'center' },
  campo: { flex: 1, maxHeight: 120, minHeight: 48, paddingHorizontal: espaciado.m,
    paddingVertical: espaciado.s, borderWidth: 1, borderColor: colores.linea,
    borderRadius: radios.l, color: colores.tinta, fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.escala.cuerpo, textAlignVertical: 'center' },
  microfono: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center',
    borderRadius: radios.round, borderWidth: 1, borderColor: colores.accion,
    backgroundColor: colores.superficie },
  enviar: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center',
    borderRadius: radios.round, backgroundColor: colores.accion },
  enviarDeshabilitado: { opacity: 0.45 },
});
