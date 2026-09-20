import React, { useRef, useState } from 'react';
import {
  ActivityIndicator, KeyboardAvoidingView, NativeScrollEvent, NativeSyntheticEvent,
  Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icono } from '../../components/shared/Icono';
import { RespuestaChat } from '../../components/consultas/RespuestaChat';
import { SelectorDocumento } from '../../components/consultas/SelectorDocumento';
import { Intercambio, useAsistente } from '../../controllers/consultas/useAsistente';
import { anchos, colores, espaciado, radios, tipografia } from '../../theme';

export function AsistenteView() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { documento, elegirDocumento, intercambios, enviando, preguntar, limpiarConversacion } = useAsistente();
  const [texto, setTexto] = useState('');
  const [eligiendo, setEligiendo] = useState(false);
  const [lejosDelFinal, setLejosDelFinal] = useState(false);
  const scroll = useRef<ScrollView>(null);
  const cercaDelFinal = useRef(true);

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
    setTexto('');
    cercaDelFinal.current = true;
    setLejosDelFinal(false);
    const aceptado = await preguntar(pendiente);
    if (!aceptado) setTexto(pendiente);
  };

  return (
    <KeyboardAvoidingView style={styles.raiz} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.cabecera, { paddingTop: Math.max(insets.top, espaciado.s) }]}>
        <View style={styles.ancho}>
          <View style={styles.cabeceraFila}>
            <View style={styles.cabeceraTexto}>
              <Text style={styles.titulo}>Asistente jurídico</Text>
              <Text style={styles.subtitulo}>Consultas sobre normativa y tus documentos</Text>
            </View>
            {intercambios.length > 0 ? (
              <Pressable onPress={() => { limpiarConversacion(); setTexto(''); }}
                accessibilityRole="button" accessibilityLabel="Nueva conversación" style={styles.nueva}>
                <Icono nombre="create-outline" tamano={20} color={colores.accion} />
              </Pressable>
            ) : null}
          </View>
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
        keyboardShouldPersistTaps="handled" onScroll={alDesplazar} scrollEventThrottle={100}
        onContentSizeChange={() => { if (cercaDelFinal.current) scroll.current?.scrollToEnd({ animated: true }); }}>
        <View style={styles.ancho}>
          {intercambios.length === 0 ? (
            <View style={styles.vacio}>
              <Icono nombre="chatbubbles-outline" tamano={34} color={colores.accion} />
              <Text style={styles.vacioTitulo}>¿En qué puedo ayudarte?</Text>
              <Text style={styles.vacioTexto}>Preguntá sobre derecho civil o trabajá con un documento.</Text>
              <View style={styles.sugerencias}>
                <Sugerencia icono="chatbubble-outline" titulo="Hacer una consulta jurídica"
                  onPress={() => setTexto('¿Qué establece el Código Civil sobre responsabilidad contractual?')} />
                <Sugerencia icono="attach-outline" titulo="Adjuntar un documento"
                  onPress={() => setEligiendo(true)} />
                <Sugerencia icono="document-text-outline" titulo="Analizar un contrato"
                  onPress={() => { setTexto('Analizá este contrato.'); if (!documento) setEligiendo(true); }} />
              </View>
            </View>
          ) : intercambios.map((intercambio) => <Turno key={intercambio.id} intercambio={intercambio} />)}
        </View>
      </ScrollView>

      {lejosDelFinal ? (
        <Pressable onPress={irAlFinal} style={styles.irFinal} accessibilityRole="button">
          <Icono nombre="arrow-down" tamano={16} color={colores.accion} />
          <Text style={styles.irFinalTexto}>Ir al final</Text>
        </Pressable>
      ) : null}

      <View style={[styles.compositorArea, { paddingBottom: Math.max(insets.bottom, espaciado.s) }]}>
        <View style={[styles.ancho, styles.compositor]}>
          <Pressable onPress={() => setEligiendo(true)} style={styles.adjuntar}
            accessibilityRole="button" accessibilityLabel="Adjuntar documento">
            <Icono nombre="attach-outline" tamano={24} color={colores.accion} />
          </Pressable>
          <TextInput style={styles.campo} value={texto} onChangeText={setTexto} multiline
            placeholder="Escribí tu mensaje..." placeholderTextColor={colores.tintaSuave}
            maxLength={4000}
            onKeyPress={(evento) => {
              const tecla = evento.nativeEvent as typeof evento.nativeEvent & { shiftKey?: boolean };
              if (Platform.OS === 'web' && tecla.key === 'Enter' && !tecla.shiftKey) {
                evento.preventDefault();
                void enviar();
              }
            }} />
          <Pressable onPress={() => void enviar()} disabled={enviando || texto.trim().length < 3}
            style={[styles.enviar, (enviando || texto.trim().length < 3) && styles.enviarDeshabilitado]}
            accessibilityRole="button" accessibilityLabel="Enviar mensaje">
            <Icono nombre="send" tamano={20} color={colores.accionTexto} />
          </Pressable>
        </View>
      </View>
      <SelectorDocumento visible={eligiendo} onCerrar={() => setEligiendo(false)} onElegir={elegirDocumento} />
    </KeyboardAvoidingView>
  );
}

function Turno({ intercambio }: { intercambio: Intercambio }) {
  const { consulta } = intercambio;
  const procesando = !consulta || consulta.estado === 'procesando';
  const tiempo = intercambio.duracionMs;
  return (
    <View style={styles.turno}>
      <View style={styles.pregunta}>
        <Text style={styles.preguntaTexto}>{intercambio.pregunta}</Text>
        {intercambio.documentoNombre ? (
          <Text style={styles.preguntaDocumento}>{intercambio.documentoNombre}</Text>
        ) : null}
      </View>
      {intercambio.error ? <Text style={styles.error}>{intercambio.error}</Text> : procesando ? (
        <View style={styles.procesando}>
          <ActivityIndicator size="small" color={colores.accion} />
          <Text style={styles.etapa}>{intercambio.etapa ?? 'Pensando...'}</Text>
        </View>
      ) : consulta?.respuesta ? (
        <>
          <RespuestaChat respuesta={consulta.respuesta} documentoId={consulta.documento_id} />
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
  titulo: { fontFamily: tipografia.familias.titulo, fontSize: tipografia.escala.subtitulo,
    color: colores.tinta },
  subtitulo: { fontFamily: tipografia.familias.cuerpo, fontSize: tipografia.escala.nota,
    color: colores.tintaSuave, marginTop: 2 },
  nueva: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  documento: { flexDirection: 'row', alignItems: 'center', gap: espaciado.xs,
    marginTop: espaciado.s, backgroundColor: colores.papel, borderRadius: radios.m,
    paddingHorizontal: espaciado.s, minHeight: 48 },
  documentoInfo: { flex: 1, minWidth: 0, marginLeft: espaciado.xs },
  documentoEtiqueta: { fontFamily: tipografia.familias.cuerpo, fontSize: 11,
    color: colores.tintaSuave },
  documentoNombre: { fontFamily: tipografia.familias.cuerpoFuerte, fontSize: tipografia.escala.nota,
    color: colores.tinta },
  accion: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  mensajes: { flex: 1 },
  mensajesContenido: { flexGrow: 1, paddingHorizontal: espaciado.m, paddingVertical: espaciado.l },
  vacio: { flex: 1, minHeight: 330, justifyContent: 'center', alignItems: 'center' },
  vacioTitulo: { fontFamily: tipografia.familias.titulo, fontSize: tipografia.escala.subtitulo,
    color: colores.tinta, marginTop: espaciado.m, textAlign: 'center' },
  vacioTexto: { fontFamily: tipografia.familias.cuerpo, fontSize: tipografia.escala.nota,
    color: colores.tintaSuave, marginTop: espaciado.xs, textAlign: 'center' },
  sugerencias: { width: '100%', maxWidth: 370, gap: espaciado.s, marginTop: espaciado.l },
  sugerencia: { flexDirection: 'row', alignItems: 'center', gap: espaciado.s,
    padding: espaciado.m, backgroundColor: colores.superficie, borderWidth: 1,
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
  procesando: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start',
    gap: espaciado.s, marginTop: espaciado.m, padding: espaciado.m,
    backgroundColor: colores.superficie, borderRadius: radios.m },
  etapa: { color: colores.tintaSuave, fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.escala.nota },
  error: { color: colores.alerta, fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.escala.cuerpo, marginTop: espaciado.m },
  tiempo: { alignSelf: 'flex-end', color: colores.tintaSuave, fontFamily: tipografia.familias.cuerpo,
    fontSize: 11, marginTop: espaciado.xs, marginRight: espaciado.xs },
  irFinal: { position: 'absolute', bottom: 90, alignSelf: 'center', flexDirection: 'row',
    alignItems: 'center', gap: espaciado.xs, paddingHorizontal: espaciado.m,
    minHeight: 38, backgroundColor: colores.superficie, borderWidth: 1,
    borderColor: colores.linea, borderRadius: radios.round },
  irFinalTexto: { color: colores.accion, fontFamily: tipografia.familias.cuerpoFuerte,
    fontSize: tipografia.escala.nota },
  compositorArea: { backgroundColor: colores.superficie, borderTopWidth: 1,
    borderTopColor: colores.linea, paddingHorizontal: espaciado.m, paddingTop: espaciado.s },
  compositor: { flexDirection: 'row', alignItems: 'flex-end', gap: espaciado.s },
  adjuntar: { width: 42, height: 44, alignItems: 'center', justifyContent: 'center' },
  campo: { flex: 1, maxHeight: 120, minHeight: 44, paddingHorizontal: espaciado.m,
    paddingVertical: espaciado.s, borderWidth: 1, borderColor: colores.linea,
    borderRadius: radios.l, color: colores.tinta, fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.escala.cuerpo, textAlignVertical: 'center' },
  enviar: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center',
    borderRadius: radios.round, backgroundColor: colores.accion },
  enviarDeshabilitado: { opacity: 0.45 },
});
