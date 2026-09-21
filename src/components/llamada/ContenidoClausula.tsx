import React from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Operacion } from '../../models/llamada';
import { PaginaEscaneada } from '../../services/escaner/escanerPuro';
import { colores, espaciado, radios, tipografia } from '../../theme';

interface Props {
  pagina: PaginaEscaneada | null;
  /** El texto que quedó como contexto de las próximas preguntas, si se leyó bien. */
  texto: string | null;
  operacion: Operacion | null;
  alPreguntar: () => void;
  alConvertir: () => void;
  alRepetir: () => void;
  alQuitar: () => void;
}

/**
 * Una cláusula fotografiada: la foto, lo que se leyó y qué hacer. Mientras está activa, cada
 * pregunta que hagas por voz lleva este texto como contexto (por el mismo endpoint de consultas).
 */
export function ContenidoClausula({ pagina, texto, operacion, alPreguntar, alConvertir, alRepetir, alQuitar }: Props) {
  const ocupado = operacion !== null;
  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <Text style={styles.titulo}>Cláusula fotografiada</Text>
      {pagina ? <Image source={{ uri: pagina.uri }} style={styles.foto} resizeMode="cover" /> : null}

      {ocupado ? (
        <View style={styles.progreso}>
          <ActivityIndicator color={colores.accion} />
          <Text style={styles.progresoTexto}>{operacion.texto}</Text>
        </View>
      ) : texto ? (
        <>
          <Text style={styles.nota}>Texto reconocido (sin corregir). Ya puedes preguntarme sobre esta cláusula.</Text>
          <Text style={styles.texto} selectable>{texto}</Text>
          <Boton texto="Preguntar sobre esta cláusula" onPress={alPreguntar} />
          <Boton texto="Convertir en documento" onPress={alConvertir} secundario />
        </>
      ) : (
        <Text style={styles.error}>
          {pagina?.estado === 'error'
            ? (pagina.motivo ?? 'No se pudo leer la foto.')
            : 'No se detectó texto en la foto. Repítela con buena luz y enfocando la cláusula.'}
        </Text>
      )}

      {!ocupado ? (
        <>
          <Boton texto="Repetir la foto" onPress={alRepetir} secundario />
          <Pressable onPress={alQuitar} accessibilityRole="button" style={styles.quitar}>
            <Text style={styles.quitarTexto}>Quitar la cláusula</Text>
          </Pressable>
        </>
      ) : null}
    </ScrollView>
  );
}

function Boton({ texto, onPress, secundario }: { texto: string; onPress: () => void; secundario?: boolean }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={[styles.boton, secundario && styles.botonSecundario]}>
      <Text style={[styles.botonTexto, secundario && styles.botonTextoSecundario]}>{texto}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: espaciado.m, paddingBottom: espaciado.xl, gap: espaciado.s },
  titulo: { fontFamily: tipografia.familias.titulo, fontSize: tipografia.escala.subtitulo, color: colores.tinta },
  foto: { width: '100%', height: 120, borderRadius: radios.s, borderWidth: 1, borderColor: colores.linea, backgroundColor: colores.papel },
  progreso: { flexDirection: 'row', alignItems: 'center', gap: espaciado.s },
  progresoTexto: { flex: 1, fontFamily: tipografia.familias.cuerpoFuerte, fontSize: tipografia.escala.cuerpo, color: colores.tinta },
  nota: { fontFamily: tipografia.familias.cuerpo, fontSize: tipografia.escala.nota, color: colores.tintaSuave, lineHeight: 20 },
  texto: {
    fontFamily: tipografia.familias.cuerpo, fontSize: tipografia.escala.nota, lineHeight: 21, color: colores.tinta,
    backgroundColor: colores.papel, borderWidth: 1, borderColor: colores.linea, borderRadius: radios.s, padding: espaciado.m,
  },
  error: { fontFamily: tipografia.familias.cuerpo, fontSize: tipografia.escala.cuerpo, color: colores.alerta, lineHeight: 24 },
  boton: { minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: radios.m, backgroundColor: colores.accion, paddingHorizontal: espaciado.m },
  botonSecundario: { backgroundColor: colores.superficie, borderWidth: 1, borderColor: colores.accion },
  botonTexto: { fontFamily: tipografia.familias.cuerpoFuerte, fontSize: tipografia.escala.cuerpo, color: colores.accionTexto },
  botonTextoSecundario: { color: colores.accion },
  quitar: { alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center' },
  quitarTexto: { fontFamily: tipografia.familias.cuerpoFuerte, fontSize: tipografia.escala.nota, color: colores.alerta },
});
