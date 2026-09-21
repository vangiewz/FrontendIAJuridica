import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Icono, NombreIcono } from '../shared/Icono';
import { Ejemplo, IdCapacidad } from '../../config/capacidadesAsistente';
import { CapacidadVista } from '../../services/llamada/ayudaAsistente';
import { colores, espaciado, radios, tipografia } from '../../theme';

/** Un icono por capacidad. Es solo presentación: qué capacidades existen lo decide el catálogo. */
const ICONOS: Record<IdCapacidad, NombreIcono> = {
  consulta: 'chatbubbles-outline',
  documentos: 'document-text-outline',
  camara: 'camera-outline',
  clausula: 'reader-outline',
  analisis: 'search-outline',
  comparacion: 'git-compare-outline',
  generacion: 'create-outline',
  reportes: 'bar-chart-outline',
  salida: 'share-social-outline',
  recibir: 'download-outline',
  recordatorios: 'notifications-outline',
  voz: 'mic-outline',
  paneles: 'albums-outline',
  encadenar: 'link-outline',
};

interface Props {
  capacidades: CapacidadVista[];
  /** Cuántos ejemplos por capacidad (el resto se omite). Sin valor: todos. */
  maxEjemplos?: number;
  /** Con detalles (las aclaraciones de cada capacidad). Los chats cortos los omiten. */
  conDetalles?: boolean;
}

/**
 * Las capacidades del asistente como tarjetas: nombre, qué hace y frases para pedirlo. La usan el panel de
 * la llamada y el chat, así que los dos muestran exactamente lo mismo, sacado del catálogo.
 */
export function ListaCapacidades({ capacidades, maxEjemplos, conDetalles = true }: Props) {
  return (
    <View style={styles.lista}>
      {capacidades.map((c) => (
        <View key={c.id} style={styles.tarjeta}>
          <View style={styles.titulo}>
            <Icono nombre={ICONOS[c.id]} tamano={18} color={colores.accion} />
            <Text style={styles.tituloTexto} accessibilityRole="header">{c.titulo}</Text>
          </View>
          <Text style={styles.descripcion}>{c.descripcion}</Text>
          <Ejemplos ejemplos={maxEjemplos ? c.ejemplos.slice(0, maxEjemplos) : c.ejemplos} />
          {conDetalles && c.detalles.length > 0 ? (
            <View style={styles.detalles}>
              {c.detalles.map((d) => (
                <Text key={d} style={styles.detalle}>• {d}</Text>
              ))}
            </View>
          ) : null}
        </View>
      ))}
    </View>
  );
}

/** Frases para pedir algo: entre comillas si se dicen; sin ellas si son un gesto («Compartir → Asistente Jurídico»). */
export function Ejemplos({ ejemplos }: { ejemplos: Ejemplo[] }) {
  if (ejemplos.length === 0) return null;
  return (
    <View style={styles.ejemplos}>
      {ejemplos.map((e) => (
        <Text key={e.texto} style={styles.ejemplo} selectable>
          {e.gesto ? `→ ${e.texto}` : `«${e.texto}»`}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  lista: { gap: espaciado.s },
  tarjeta: {
    gap: espaciado.xs, padding: espaciado.m, borderRadius: radios.m, borderWidth: 1, borderColor: colores.linea,
    backgroundColor: colores.papel,
  },
  titulo: { flexDirection: 'row', alignItems: 'center', gap: espaciado.xs },
  tituloTexto: { flex: 1, fontFamily: tipografia.familias.cuerpoFuerte, fontSize: tipografia.escala.cuerpo, color: colores.tinta },
  descripcion: { fontFamily: tipografia.familias.cuerpo, fontSize: tipografia.escala.nota, lineHeight: 21, color: colores.tinta },
  ejemplos: { gap: 2, paddingLeft: espaciado.s, borderLeftWidth: 3, borderLeftColor: colores.linea },
  ejemplo: { fontFamily: tipografia.familias.cuerpo, fontSize: tipografia.escala.nota, lineHeight: 21, color: colores.accion },
  detalles: { gap: 2 },
  detalle: { fontFamily: tipografia.familias.cuerpo, fontSize: 13, lineHeight: 19, color: colores.tintaSuave },
});
