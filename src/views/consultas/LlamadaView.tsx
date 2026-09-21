import React, { useEffect, useRef, useState } from 'react';
import {
  BackHandler, Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icono, NombreIcono } from '../../components/shared/Icono';
import { AvatarAsistente } from '../../components/avatar/AvatarAsistente';
import { PanelLlamada } from '../../components/llamada/PanelLlamada';
import { EscanerCamara } from '../../components/llamada/EscanerCamara';
import { OCR_DISPONIBLE } from '../../services/escaner/ocrLocal';
import { ContenidoPanelLlamada, tituloDePanel } from '../../components/llamada/ContenidoPanelLlamada';
import { ContextoLlamada, FichaContexto } from '../../components/llamada/ContextoLlamada';
import { ContenidoPanel } from '../../models/llamada';
import { ModoMicrofono, useLlamada } from '../../controllers/consultas/useLlamada';
import { useVolver } from '../../controllers/navegacion/useVolver';
import { colores, espaciado, radios, tipografia } from '../../theme';

const MICROFONO: Record<ModoMicrofono, { icono: NombreIcono; etiqueta: string; accesible: string }> = {
  activo: { icono: 'mic', etiqueta: 'Silenciar', accesible: 'Silenciar el micrófono' },
  silenciado: { icono: 'mic-off', etiqueta: 'Activar', accesible: 'Activar el micrófono' },
  interrumpir: { icono: 'mic', etiqueta: 'Interrumpir', accesible: 'Interrumpir al asistente y hablar' },
  hablar: { icono: 'mic', etiqueta: 'Hablar', accesible: 'Tocar para hablar' },
};

/**
 * Llamada con el asistente jurídico: pantalla completa, sin burbujas ni chat. La voz y el
 * micrófono usan el motor nativo del teléfono; en web no existen, así que ahí se explica y
 * se vuelve al chat.
 *
 * Es la interfaz unificada de los módulos de IA: la voz controla, el avatar representa al
 * asistente y un PANEL deslizable muestra lo visual (respuesta y fuentes, documento,
 * comparación, documento generado, reporte) SIN salir de esta pantalla. Como esta vista
 * nunca navega, `useLlamada` no se desmonta y la voz no se corta al abrir o cerrar el panel.
 */
export function LlamadaView() {
  const volver = useVolver('/(app)/(tabs)/');
  if (Platform.OS === 'web') {
    return (
      <View style={[styles.raiz, styles.centro]}>
        <Icono nombre="call-outline" tamano={40} color={colores.accion} />
        <Text style={styles.titulo}>Llamada con el asistente</Text>
        <Text style={styles.nota}>
          La conversación por voz solo está disponible en la app del celular. Aquí puedes usar el chat.
        </Text>
        <Pressable onPress={volver} style={styles.secundario} accessibilityRole="button">
          <Text style={styles.secundarioTexto}>Volver al chat</Text>
        </Pressable>
      </View>
    );
  }
  return <LlamadaActiva />;
}

function LlamadaActiva() {
  const volver = useVolver('/(app)/(tabs)/');
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { documentoId, documentoNombre } = useLocalSearchParams<{ documentoId?: string; documentoNombre?: string }>();
  const llamada = useLlamada(documentoId ? { id: documentoId, nombre_archivo: documentoNombre ?? 'Documento' } : null);
  const { panel, acciones } = llamada;
  const escaner = acciones.escaner;

  // El panel y el avatar comparten la pantalla: con el panel a media altura el avatar se
  // reduce; con el panel casi completo queda en una cabecera compacta. Nunca desaparece.
  const conPanel = panel.abierto && panel.tamano !== 'minimizado';
  const expandido = panel.abierto && panel.tamano === 'expandido';
  const areaUtil = height - insets.top - insets.bottom;
  const alturaMedio = Math.round(areaUtil * 0.46);
  const alturaExpandido = Math.max(alturaMedio, Math.round(areaUtil - 240));
  const pantallaBaja = height < 720;
  const tamano = expandido ? 52
    : conPanel ? Math.round(Math.min(width * 0.3, 104, height * 0.15))
    : Math.round(Math.min(width * 0.66, height * 0.36, 300));
  const mic = MICROFONO[llamada.modoMicrofono];
  const enError = llamada.estadoAvatar === 'error';

  // El último contenido se conserva mientras el panel se pliega, para que no parpadee vacío.
  const ultimoContenido = useRef<ContenidoPanel | null>(null);
  if (panel.contenido) ultimoContenido.current = panel.contenido;
  const contenido = panel.contenido ?? ultimoContenido.current;

  // «Atrás» de Android: primero es del panel (un nivel, o cerrarlo). Sin panel abierto se
  // mantiene el comportamiento de siempre. Nunca finaliza la llamada estando el panel abierto.
  useEffect(() => {
    const oyente = BackHandler.addEventListener('hardwareBackPress', () => {
      // La cámara está encima de todo: «atrás» la cierra (pidiendo confirmar si hay páginas).
      if (escaner.camara) { escaner.solicitarCancelar(); return true; }
      if (!panel.abierto) return false;
      if (panel.nivel > 1) panel.volver(); else panel.cerrar();
      return true;
    });
    return () => oyente.remove();
  }, [panel.abierto, panel.nivel, panel.volver, panel.cerrar, escaner]);

  const colgar = () => {
    llamada.finalizar();
    volver();
  };

  // Lo que está activo, en fichas discretas que abren su panel.
  const fichas: FichaContexto[] = [];
  if (acciones.ficha) {
    fichas.push({
      clave: 'documento', icono: acciones.ficha.escaneado ? 'scan-outline' : 'document-text-outline',
      texto: acciones.ficha.escaneado
        ? `Documento escaneado · ${acciones.ficha.escaneado.paginas} ${acciones.ficha.escaneado.paginas === 1 ? 'página' : 'páginas'}`
        : acciones.ficha.nombre,
      accesible: `Documento activo ${acciones.ficha.nombre}. Abrir`,
      alPulsar: () => panel.abrir({ tipo: 'documento' }), alQuitar: () => { void acciones.cerrarDocumento(); },
    });
  }
  const nRecibidos = acciones.recibidos.recibidos.length + acciones.recibidos.fallidos.length;
  if (nRecibidos > 0) {
    fichas.push({
      clave: 'recibido', icono: 'download-outline',
      texto: nRecibidos === 1 ? 'Archivo recibido' : `${nRecibidos} archivos recibidos`,
      accesible: 'Archivo recibido de otra app, esperando tu decisión. Abrir', alPulsar: () => panel.abrir({ tipo: 'recibido' }),
    });
  }
  const nRecordatorios = acciones.recordatorios.recordatorios.filter((x) => x.estado !== 'pasado').length;
  if (acciones.recordatorios.disponible && nRecordatorios > 0) {
    fichas.push({
      clave: 'recordatorios', icono: 'notifications-outline',
      texto: nRecordatorios === 1 ? '1 recordatorio' : `${nRecordatorios} recordatorios`,
      accesible: 'Recordatorios programados en este teléfono. Abrir', alPulsar: acciones.recordatorios.abrirLista,
    });
  }
  if (escaner.pendiente) {
    fichas.push({
      clave: 'escaneo', icono: 'camera-outline', texto: `Escaneo · ${escaner.paginas.length} ${escaner.paginas.length === 1 ? 'página' : 'páginas'}`,
      accesible: 'Escaneo pendiente de analizar. Abrir', alPulsar: () => panel.abrir({ tipo: 'escaneo' }), alQuitar: escaner.cancelar,
    });
  }
  if (escaner.clausula) {
    fichas.push({
      clave: 'clausula', icono: 'reader-outline', texto: 'Cláusula fotografiada',
      accesible: 'Cláusula fotografiada, usada como contexto. Abrir', alPulsar: () => panel.abrir({ tipo: 'clausula' }),
      alQuitar: escaner.quitarClausula,
    });
  }
  if (acciones.seleccion) {
    fichas.push({
      clave: 'seleccion', icono: 'git-compare-outline', texto: 'Comparación en curso',
      accesible: 'Comparación en curso. Abrir',
      alPulsar: () => panel.abrir({ tipo: 'archivo', para: acciones.seleccion?.a ? 'comparar_b' : 'comparar_a' }),
    });
  } else if (acciones.comparacion) {
    fichas.push({
      clave: 'comparacion', icono: 'git-compare-outline',
      texto: `${acciones.comparacion.nombre_a} · ${acciones.comparacion.nombre_b}`,
      accesible: 'Comparación de documentos. Abrir', alPulsar: () => panel.abrir({ tipo: 'comparacion' }),
    });
  }
  if (acciones.borrador) {
    fichas.push({
      clave: 'borrador', icono: 'create-outline', texto: 'Preparando un documento',
      accesible: 'Documento en preparación. Abrir', alPulsar: () => panel.abrir({ tipo: 'borrador' }),
    });
  } else if (acciones.generado) {
    fichas.push({
      clave: 'generado', icono: 'create-outline', texto: `Borrador · versión ${acciones.generado.version}`,
      accesible: 'Documento generado. Abrir', alPulsar: () => panel.abrir({ tipo: 'documento_generado' }),
    });
  }
  if (acciones.reporte) {
    fichas.push({
      clave: 'reporte', icono: 'bar-chart-outline', texto: acciones.reporte.titulo,
      accesible: `Reporte ${acciones.reporte.titulo}. Abrir`, alPulsar: () => panel.abrir({ tipo: 'reporte' }),
    });
  }

  const estado = (
    <>
      <Text style={[styles.estado, conPanel && styles.estadoCompacto, enError && styles.estadoError]}
        numberOfLines={conPanel ? 2 : undefined} accessibilityLiveRegion="polite">
        {llamada.titulo}
      </Text>
      {llamada.espera && !expandido ? <Espera iniciadoEn={llamada.espera.iniciadoEn} /> : null}
    </>
  );

  return (
    <View style={[styles.raiz, { paddingTop: insets.top + espaciado.m, paddingBottom: Math.max(insets.bottom, espaciado.m) + espaciado.s }]}>
      {expandido ? null : (
        <View style={styles.cabecera}>
          <Text style={styles.titulo}>Asistente Jurídico</Text>
          <Text style={styles.subtitulo} numberOfLines={1}>
            {llamada.documento ? `Llamada con IA · ${llamada.documento.nombre_archivo}` : 'Llamada con IA'}
          </Text>
        </View>
      )}

      <View style={[styles.centro, conPanel && styles.centroConPanel]}>
        {expandido ? (
          <View style={styles.filaCompacta}>
            <AvatarAsistente estado={llamada.estadoAvatar} tamano={tamano} />
            <View style={styles.filaCompactaTextos}>
              <Text style={styles.subtituloCompacto}>Asistente Jurídico · en llamada</Text>
              {estado}
            </View>
          </View>
        ) : (
          <>
            <AvatarAsistente estado={llamada.estadoAvatar} tamano={tamano} />
            {estado}
          </>
        )}

        {/* La respuesta escrita y la transcripción ocupan lugar: con el panel abierto se ven en él. */}
        {!conPanel && llamada.lecturaFallida ? (
          <ScrollView style={styles.respuesta} contentContainerStyle={styles.respuestaContenido}>
            <Text style={styles.respuestaTexto} selectable>{llamada.lecturaFallida}</Text>
          </ScrollView>
        ) : !conPanel && llamada.transcripcion ? (
          <Text style={styles.transcripcion} numberOfLines={4}>«{llamada.transcripcion}»</Text>
        ) : null}

        {expandido || (conPanel && pantallaBaja) ? null : <ContextoLlamada fichas={fichas} />}

        <View style={styles.acciones}>
          {llamada.puedeReintentar ? (
            <Enlace icono="refresh" texto="Reintentar" onPress={llamada.reintentar} />
          ) : null}
          {llamada.lecturaFallida && !conPanel ? (
            <Enlace icono="mic-outline" texto="Continuar" onPress={llamada.continuar} />
          ) : null}
          {OCR_DISPONIBLE && !conPanel ? (
            <Enlace icono="camera-outline" texto="Escanear cláusula" onPress={() => { void escaner.iniciar('clausula'); }} />
          ) : null}
          {llamada.consultaId && !conPanel ? (
            // Abre el panel DENTRO de la llamada. No navega, no detiene la voz.
            <Enlace icono="document-text-outline" texto="Ver respuesta y fuentes" onPress={llamada.verRespuesta} />
          ) : null}
        </View>
      </View>

      <PanelLlamada
        abierto={panel.abierto} tamano={panel.tamano} titulo={tituloDePanel(contenido, llamada)}
        hayNivelAtras={panel.nivel > 1} alturaMedio={alturaMedio} alturaExpandido={alturaExpandido}
        alVolver={panel.volver} alCerrar={panel.cerrar} alMinimizar={panel.minimizar}
        alRestaurar={panel.restaurar} alAlternarExpansion={panel.alternar}
        alSubir={() => (panel.tamano === 'minimizado' ? panel.restaurar() : panel.expandir())}
        alBajar={() => (panel.tamano === 'expandido' ? panel.restaurar() : panel.minimizar())}>
        {contenido ? <ContenidoPanelLlamada contenido={contenido} llamada={llamada} /> : null}
      </PanelLlamada>

      <View style={[styles.botones, conPanel && styles.botonesCompactos]} pointerEvents={escaner.camara ? 'none' : 'auto'}>
        <Boton icono={mic.icono} etiqueta={mic.etiqueta} accesible={mic.accesible}
          onPress={llamada.microfono} compacto={conPanel}
          estilo={llamada.modoMicrofono === 'silenciado' ? styles.botonSilencio : styles.botonMic}
          colorIcono={llamada.modoMicrofono === 'silenciado' ? colores.accionTexto : colores.accion} />
        <Boton icono="close" etiqueta="Finalizar" accesible="Finalizar la llamada" onPress={colgar}
          compacto={conPanel}
          estilo={styles.botonColgar} colorIcono={colores.accionTexto} />
      </View>

      {/* La cámara del escáner: una capa DENTRO de la llamada, que sigue montada y hablando debajo. */}
      {escaner.camara ? (
        <EscanerCamara escaner={escaner} estadoAvatar={llamada.estadoAvatar} titulo={llamada.titulo} />
      ) : null}
    </View>
  );
}

/** Reloj real de espera: el modelo local puede tardar uno o dos minutos y se dice. */
function Espera({ iniciadoEn }: { iniciadoEn: number }) {
  const [ahora, setAhora] = useState(Date.now());
  useEffect(() => {
    const reloj = setInterval(() => setAhora(Date.now()), 1000);
    return () => clearInterval(reloj);
  }, []);
  const total = Math.max(0, Math.floor((ahora - iniciadoEn) / 1000));
  return (
    <Text style={styles.nota}>
      {`${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')} · Puede tardar uno o dos minutos`}
    </Text>
  );
}

function Enlace({ icono, texto, onPress }: { icono: NombreIcono; texto: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [styles.enlace, pressed && styles.presionado]}>
      <Icono nombre={icono} tamano={18} color={colores.accion} />
      <Text style={styles.enlaceTexto}>{texto}</Text>
    </Pressable>
  );
}

function Boton({ icono, etiqueta, accesible, onPress, estilo, colorIcono, compacto = false }: {
  icono: NombreIcono; etiqueta: string; accesible: string; onPress: () => void;
  estilo: object; colorIcono: string; compacto?: boolean;
}) {
  return (
    <View style={styles.botonColumna}>
      <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={accesible}
        style={({ pressed }) => [styles.boton, compacto && styles.botonChico, estilo, pressed && styles.presionado]}>
        <Icono nombre={icono} tamano={compacto ? 26 : 32} color={colorIcono} />
      </Pressable>
      <Text style={styles.botonEtiqueta}>{etiqueta}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  raiz: { flex: 1, backgroundColor: colores.papel, paddingHorizontal: espaciado.m },
  cabecera: { alignItems: 'center', gap: 2 },
  titulo: { fontFamily: tipografia.familias.titulo, fontSize: tipografia.escala.subtitulo,
    color: colores.tinta, textAlign: 'center' },
  subtitulo: { fontFamily: tipografia.familias.cuerpo, fontSize: tipografia.escala.nota,
    color: colores.tintaSuave, textAlign: 'center' },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: espaciado.m,
    paddingHorizontal: espaciado.s },
  centroConPanel: { gap: espaciado.xs },
  estado: { fontFamily: tipografia.familias.titulo, fontSize: tipografia.escala.subtitulo,
    color: colores.tinta, textAlign: 'center', marginTop: espaciado.m },
  estadoCompacto: { fontSize: tipografia.escala.cuerpo, marginTop: espaciado.xs },
  estadoError: { color: colores.alerta },
  filaCompacta: { flexDirection: 'row', alignItems: 'center', gap: espaciado.m, width: '100%' },
  filaCompactaTextos: { flex: 1 },
  subtituloCompacto: { fontFamily: tipografia.familias.cuerpo, fontSize: tipografia.escala.nota,
    color: colores.tintaSuave },
  nota: { fontFamily: tipografia.familias.cuerpo, fontSize: tipografia.escala.nota,
    color: colores.tintaSuave, textAlign: 'center' },
  transcripcion: { fontFamily: tipografia.familias.cuerpo, fontSize: tipografia.escala.cuerpo,
    lineHeight: 24, color: colores.tintaSuave, textAlign: 'center', maxWidth: 420 },
  respuesta: { maxHeight: 190, width: '100%', maxWidth: 440, flexGrow: 0, backgroundColor: colores.superficie,
    borderWidth: 1, borderColor: colores.linea, borderRadius: radios.m },
  respuestaContenido: { padding: espaciado.m },
  respuestaTexto: { fontFamily: tipografia.familias.cuerpo, fontSize: tipografia.escala.nota,
    lineHeight: 21, color: colores.tinta },
  acciones: { alignItems: 'center', gap: espaciado.xs },
  enlace: { flexDirection: 'row', alignItems: 'center', gap: espaciado.xs, minHeight: 44,
    paddingHorizontal: espaciado.m },
  enlaceTexto: { fontFamily: tipografia.familias.cuerpoFuerte, fontSize: tipografia.escala.nota,
    color: colores.accion },
  botones: { flexDirection: 'row', justifyContent: 'center', gap: espaciado.xxl },
  botonesCompactos: { paddingTop: espaciado.s, gap: espaciado.xl },
  botonColumna: { alignItems: 'center', gap: espaciado.xs },
  boton: { width: 76, height: 76, borderRadius: radios.round, alignItems: 'center', justifyContent: 'center' },
  botonChico: { width: 56, height: 56 },
  botonMic: { backgroundColor: colores.superficie, borderWidth: 1.5, borderColor: colores.accion },
  botonSilencio: { backgroundColor: colores.tintaSuave },
  botonColgar: { backgroundColor: colores.alerta },
  botonEtiqueta: { fontFamily: tipografia.familias.cuerpoFuerte, fontSize: tipografia.escala.nota,
    color: colores.tinta },
  presionado: { opacity: 0.75 },
  secundario: { minHeight: 48, paddingHorizontal: espaciado.l, justifyContent: 'center',
    borderRadius: radios.round, borderWidth: 1, borderColor: colores.accion },
  secundarioTexto: { fontFamily: tipografia.familias.cuerpoFuerte, fontSize: tipografia.escala.nota,
    color: colores.accion },
});
