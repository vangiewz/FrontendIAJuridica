import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Icono } from '../shared/Icono';
import { ItemDocumento, esComparable } from '../../models/documentos';
import { DestinoArchivo, FichaDocumento, Operacion } from '../../models/llamada';
import { listarDocumentos } from '../../services/documentos';
import { describirTipoDocumento } from '../../models/documentos';
import { OCR_DISPONIBLE } from '../../services/escaner/ocrLocal';
import { colores, espaciado, radios, tipografia } from '../../theme';

interface Props {
  para: DestinoArchivo;
  /** Al comparar el segundo documento, el primero ya está elegido y no se ofrece de nuevo. */
  primero: FichaDocumento | null;
  operacion: Operacion | null;
  aviso: string | null;
  alSubir: () => void;
  /** Escanear con la cámara: otra forma de ingresar el documento, con el mismo destino. */
  alEscanear: () => void;
  alElegir: (documento: ItemDocumento) => void;
  alCancelar: () => void;
}

const TITULOS: Record<DestinoArchivo, string> = {
  documento: 'Selecciona un documento',
  comparar_a: 'Elige el primer documento',
  comparar_b: 'Elige el segundo documento',
};

/**
 * De dónde sale el documento (o los dos a comparar), sin salir de la llamada: subir un
 * archivo con el selector del sistema o usar uno ya guardado. Usa el mismo listado y el
 * mismo selector de archivos que el resto de la app; lo que se sube va al mismo servicio.
 */
export function ContenidoArchivo({ para, primero, operacion, aviso, alSubir, alEscanear, alElegir, alCancelar }: Props) {
  const [mios, setMios] = useState<ItemDocumento[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let vigente = true;
    setMios(null);
    setError(null);
    listarDocumentos()
      .then((lista) => { if (vigente) setMios(lista.filter(esComparable)); })
      .catch((e: any) => { if (vigente) { setMios([]); setError(e?.mensaje || 'No se pudieron cargar tus documentos.'); } });
    return () => { vigente = false; };
  }, [para]);

  const ocupado = operacion !== null;
  const lista = (mios ?? []).filter((d) => d.id !== primero?.id);

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <Text style={styles.titulo}>{TITULOS[para]}</Text>
      {para === 'comparar_b' && primero ? (
        <Text style={styles.nota}>Se comparará con «{primero.nombre}».</Text>
      ) : (
        <Text style={styles.nota}>Puedes subir un archivo (PDF, Word o texto) o usar uno que ya tengas guardado.</Text>
      )}

      {ocupado ? (
        <View style={styles.ocupado}>
          <ActivityIndicator color={colores.accion} />
          <Text style={styles.ocupadoTexto}>{operacion.texto}</Text>
        </View>
      ) : null}
      {aviso || error ? <Text style={styles.error}>{aviso ?? error}</Text> : null}

      <Pressable onPress={alSubir} disabled={ocupado} accessibilityRole="button"
        style={({ pressed }) => [styles.subir, (ocupado || pressed) && styles.atenuado]}>
        <Icono nombre="cloud-upload-outline" tamano={20} color={colores.accionTexto} />
        <Text style={styles.subirTexto}>Subir un archivo</Text>
      </Pressable>

      {OCR_DISPONIBLE ? (
        <Pressable onPress={alEscanear} disabled={ocupado} accessibilityRole="button"
          style={({ pressed }) => [styles.escanear, (ocupado || pressed) && styles.atenuado]}>
          <Icono nombre="camera-outline" tamano={20} color={colores.accion} />
          <Text style={styles.escanearTexto}>Escanear con cámara</Text>
        </Pressable>
      ) : null}

      <Text style={styles.seccion}>Mis documentos</Text>
      {mios === null ? (
        <ActivityIndicator color={colores.accion} style={styles.cargando} />
      ) : lista.length === 0 ? (
        <Text style={styles.nota}>No tienes otros documentos procesados todavía.</Text>
      ) : (
        lista.map((d) => (
          <Pressable key={d.id} onPress={() => alElegir(d)} disabled={ocupado} accessibilityRole="button"
            accessibilityLabel={`Usar ${d.nombre_archivo}`}
            style={({ pressed }) => [styles.item, (ocupado || pressed) && styles.atenuado]}>
            <Icono nombre="document-text-outline" tamano={22} />
            <View style={styles.itemTextos}>
              <Text style={styles.itemNombre} numberOfLines={1}>{d.nombre_archivo}</Text>
              <Text style={styles.itemDetalle}>{describirTipoDocumento(d.tipo_documento).etiqueta}</Text>
            </View>
            <Icono nombre="chevron-forward" tamano={18} />
          </Pressable>
        ))
      )}

      {para !== 'documento' ? (
        <Pressable onPress={alCancelar} accessibilityRole="button" style={styles.cancelar}>
          <Text style={styles.cancelarTexto}>Cancelar la comparación</Text>
        </Pressable>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: espaciado.m, paddingBottom: espaciado.xl, gap: espaciado.s },
  titulo: { fontFamily: tipografia.familias.titulo, fontSize: tipografia.escala.subtitulo, color: colores.tinta },
  nota: { fontFamily: tipografia.familias.cuerpo, fontSize: tipografia.escala.nota, color: colores.tintaSuave, lineHeight: 20 },
  error: { fontFamily: tipografia.familias.cuerpo, fontSize: tipografia.escala.nota, color: colores.alerta },
  ocupado: { flexDirection: 'row', alignItems: 'center', gap: espaciado.s, paddingVertical: espaciado.s },
  ocupadoTexto: { flex: 1, fontFamily: tipografia.familias.cuerpoFuerte, fontSize: tipografia.escala.nota, color: colores.tinta },
  subir: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: espaciado.s, minHeight: 52,
    borderRadius: radios.m, backgroundColor: colores.accion, marginTop: espaciado.xs,
  },
  subirTexto: { fontFamily: tipografia.familias.cuerpoFuerte, fontSize: tipografia.escala.cuerpo, color: colores.accionTexto },
  escanear: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: espaciado.s, minHeight: 52,
    borderRadius: radios.m, borderWidth: 1, borderColor: colores.accion, backgroundColor: colores.superficie,
  },
  escanearTexto: { fontFamily: tipografia.familias.cuerpoFuerte, fontSize: tipografia.escala.cuerpo, color: colores.accion },
  seccion: {
    fontFamily: tipografia.familias.cuerpoFuerte, fontSize: tipografia.escala.nota, color: colores.tintaSuave,
    textTransform: 'uppercase', letterSpacing: 0.5, marginTop: espaciado.m,
  },
  cargando: { marginVertical: espaciado.m },
  item: {
    flexDirection: 'row', alignItems: 'center', gap: espaciado.m, minHeight: 60, borderWidth: 1,
    borderColor: colores.linea, borderRadius: radios.m, paddingHorizontal: espaciado.m, backgroundColor: colores.papel,
  },
  itemTextos: { flex: 1 },
  itemNombre: { fontFamily: tipografia.familias.cuerpo, fontSize: tipografia.escala.cuerpo, color: colores.tinta },
  itemDetalle: { fontFamily: tipografia.familias.cuerpo, fontSize: tipografia.escala.nota, color: colores.tintaSuave, marginTop: 2 },
  atenuado: { opacity: 0.55 },
  cancelar: { alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center', marginTop: espaciado.s },
  cancelarTexto: { fontFamily: tipografia.familias.cuerpoFuerte, fontSize: tipografia.escala.nota, color: colores.tintaSuave },
});
