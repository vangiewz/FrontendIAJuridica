import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AvatarAsistente } from '../avatar/AvatarAsistente';
import { estadoAvatarDelPanel } from '../avatar/estados';
import { EstadoDictado, ErrorDictado } from '../../controllers/voz/useDictado';
import { colores, espaciado, radios, tipografia } from '../../theme';

interface Props {
  estado: EstadoDictado;
  parcial: string;
  error: ErrorDictado | null;
  enDispositivo: boolean | null;
  /** El teléfono reconoce en local pero falta el español: se ofrece instalarlo. */
  puedeInstalarIdioma: boolean;
  onInstalarIdioma: () => void;
  onListo: () => void;
  onCancelar: () => void;
  onReintentar: () => void;
  onCerrar: () => void;
  onAbrirAjustes: () => void;
}

const TITULOS: Record<Exclude<EstadoDictado, 'inactivo' | 'error'>, string> = {
  permiso: 'Solicitando permiso del micrófono…',
  escuchando: 'Te escucho…',
  transcribiendo: 'Transcribiendo…',
  instalando: 'Abriendo la descarga del idioma…',
};

/**
 * Hoja inferior del dictado: el avatar (que refleja el estado real del dictado), el texto
 * en vivo y los controles. Cubre la pantalla como una superposición, así no compite con el
 * teclado ni con el resto de la interfaz.
 */
export function PanelVoz({
  estado, parcial, error, enDispositivo, puedeInstalarIdioma, onInstalarIdioma,
  onListo, onCancelar, onReintentar, onCerrar, onAbrirAjustes,
}: Props) {
  const insets = useSafeAreaInsets();
  const visible = estado !== 'inactivo';
  const escuchando = estado === 'escuchando';

  return (
    <Modal visible={visible} transparent animationType="slide"
      onRequestClose={estado === 'error' ? onCerrar : onCancelar}>
      <View style={styles.fondo}>
        <Pressable style={styles.cortina} onPress={estado === 'error' ? onCerrar : onCancelar}
          accessibilityLabel="Cerrar" />
        <View style={[styles.hoja, { paddingBottom: Math.max(insets.bottom, espaciado.m) + espaciado.s }]}>
          {estado === 'error' && error ? (
            <>
              <AvatarAsistente estado={estadoAvatarDelPanel('error', error.informativo)} tamano={96} />
              <Text style={styles.error} accessibilityLiveRegion="polite">{error.mensaje}</Text>
              <View style={styles.botones}>
                <Boton texto="Cerrar" onPress={onCerrar} />
                {error.puedeAbrirAjustes ? <Boton texto="Abrir ajustes" onPress={onAbrirAjustes} principal /> : null}
                {error.reintentable && !error.puedeAbrirAjustes
                  ? <Boton texto="Reintentar" onPress={onReintentar} principal /> : null}
              </View>
            </>
          ) : estado !== 'inactivo' && estado !== 'error' ? (
            <>
              <AvatarAsistente estado={estadoAvatarDelPanel(estado, false)} tamano={132} />
              <Text style={styles.titulo} accessibilityLiveRegion="polite">{TITULOS[estado]}</Text>
              <Text style={[styles.texto, !parcial && styles.textoVacio]} numberOfLines={6}>
                {parcial || (escuchando ? 'Habla con naturalidad. Toca «Listo» cuando termines.' : ' ')}
              </Text>
              {escuchando && enDispositivo !== null ? (
                <Text style={styles.nota}>
                  {enDispositivo
                    ? 'Reconocimiento en tu teléfono, sin internet.'
                    : 'El reconocimiento de voz de Android puede usar internet.'}
                </Text>
              ) : null}
              {escuchando && enDispositivo === false && puedeInstalarIdioma ? (
                <Pressable onPress={onInstalarIdioma} accessibilityRole="button" style={styles.enlace}>
                  <Text style={styles.enlaceTexto}>Instalar español sin conexión</Text>
                </Pressable>
              ) : null}
              <View style={styles.botones}>
                <Boton texto="Cancelar" onPress={onCancelar} />
                {escuchando ? <Boton texto="Listo" onPress={onListo} principal /> : null}
              </View>
            </>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

function Boton({ texto, onPress, principal }: { texto: string; onPress: () => void; principal?: boolean }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button"
      style={({ pressed }) => [styles.boton, principal && styles.botonPrincipal, pressed && styles.presionado]}>
      <Text style={[styles.botonTexto, principal && styles.botonTextoPrincipal]}>{texto}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fondo: { flex: 1, justifyContent: 'flex-end' },
  cortina: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(34,32,28,0.45)' },
  hoja: { alignItems: 'center', backgroundColor: colores.superficie, paddingTop: espaciado.l,
    paddingHorizontal: espaciado.l, borderTopLeftRadius: radios.xl, borderTopRightRadius: radios.xl },
  titulo: { marginTop: espaciado.s, color: colores.tinta, fontFamily: tipografia.familias.titulo,
    fontSize: tipografia.escala.subtitulo, textAlign: 'center' },
  texto: { marginTop: espaciado.m, minHeight: 52, color: colores.tinta,
    fontFamily: tipografia.familias.cuerpo, fontSize: tipografia.escala.cuerpo,
    lineHeight: 24, textAlign: 'center' },
  textoVacio: { color: colores.tintaSuave, fontSize: tipografia.escala.nota },
  nota: { marginTop: espaciado.xs, color: colores.tintaSuave, fontFamily: tipografia.familias.cuerpo,
    fontSize: 12, textAlign: 'center' },
  enlace: { minHeight: 44, justifyContent: 'center', paddingHorizontal: espaciado.m },
  enlaceTexto: { color: colores.accion, fontFamily: tipografia.familias.cuerpoFuerte,
    fontSize: tipografia.escala.nota, textDecorationLine: 'underline' },
  error: { marginTop: espaciado.m, color: colores.tinta, fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.escala.cuerpo, lineHeight: 24, textAlign: 'center' },
  botones: { flexDirection: 'row', gap: espaciado.s, marginTop: espaciado.l, alignSelf: 'stretch',
    justifyContent: 'center' },
  boton: { flex: 1, maxWidth: 190, minHeight: 48, alignItems: 'center', justifyContent: 'center',
    borderRadius: radios.round, borderWidth: 1, borderColor: colores.linea,
    backgroundColor: colores.superficie, paddingHorizontal: espaciado.m },
  botonPrincipal: { backgroundColor: colores.accion, borderColor: colores.accion },
  presionado: { opacity: 0.75 },
  botonTexto: { color: colores.tinta, fontFamily: tipografia.familias.cuerpoFuerte,
    fontSize: tipografia.escala.cuerpo },
  botonTextoPrincipal: { color: colores.accionTexto },
});
