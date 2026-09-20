import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View,
} from 'react-native';
import { Icono } from '../shared/Icono';
import { ItemDocumento } from '../../models/documentos';
import { listarDocumentos, subirDocumento } from '../../services/documentos';
import { seleccionarDocumento } from '../../services/selectorArchivos';
import { colores, espaciado, radios, tipografia } from '../../theme';

interface Props {
  visible: boolean;
  onCerrar: () => void;
  onElegir: (documento: ItemDocumento) => void;
}

/**
 * De donde sale el documento activo: uno nuevo o uno que ya esta en la cuenta.
 *
 * No obliga a volver a subir lo que ya se subio, que es lo que pasaba cuando Consultas
 * y Documentos eran dos modulos separados. La carga y el listado son los existentes:
 * aca no hay otra logica de subida ni otro parseo.
 */
export function SelectorDocumento({ visible, onCerrar, onElegir }: Props) {
  const [mios, setMios] = useState<ItemDocumento[] | null>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setError(null);
    setMios(null);
    listarDocumentos()
      .then(setMios)
      .catch((e: any) => {
        setMios([]);
        setError(e?.mensaje || 'No se pudieron cargar tus documentos');
      });
  }, [visible]);

  const subir = async () => {
    setError(null);
    const archivo = await seleccionarDocumento();
    if (!archivo) return;
    setSubiendo(true);
    try {
      const documento = await subirDocumento(archivo);
      onElegir({
        id: documento.id,
        nombre_archivo: documento.nombre_archivo,
        tipo_documento: documento.tipo_documento,
        estado: documento.estado,
        subido_en: documento.subido_en,
      });
      onCerrar();
    } catch (e: any) {
      setError(e?.mensaje || 'No se pudo subir el documento');
    } finally {
      setSubiendo(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCerrar}>
      <Pressable style={styles.fondo} onPress={onCerrar}>
        <Pressable style={styles.panel} onPress={() => {}}>
          <Text style={styles.titulo}>Adjuntar un documento</Text>
          <Text style={styles.ayuda}>
            Podés subir un archivo nuevo (PDF, Word o texto) o trabajar con uno que ya
            tengas guardado.
          </Text>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable
            onPress={subir}
            disabled={subiendo}
            style={styles.subir}
            accessibilityRole="button"
          >
            {subiendo ? (
              <ActivityIndicator color={colores.accionTexto} />
            ) : (
              <>
                <Icono nombre="cloud-upload-outline" tamano={20} color={colores.accionTexto} />
                <Text style={styles.subirTexto}>Subir un archivo</Text>
              </>
            )}
          </Pressable>

          <Text style={styles.seccion}>Mis documentos</Text>
          {mios === null ? (
            <ActivityIndicator color={colores.accion} style={styles.cargando} />
          ) : mios.length === 0 ? (
            <Text style={styles.vacio}>Todavía no tenés documentos guardados.</Text>
          ) : (
            <ScrollView style={styles.lista}>
              {mios.map((documento) => (
                <Pressable
                  key={documento.id}
                  onPress={() => {
                    onElegir(documento);
                    onCerrar();
                  }}
                  style={styles.item}
                  accessibilityRole="button"
                  accessibilityLabel={'Usar ' + documento.nombre_archivo}
                >
                  <Icono nombre="document-text-outline" tamano={22} />
                  <View style={styles.itemTextos}>
                    <Text style={styles.itemNombre} numberOfLines={1}>
                      {documento.nombre_archivo}
                    </Text>
                    <Text style={styles.itemDetalle}>
                      {documento.tipo_documento ?? 'sin clasificar'}
                    </Text>
                  </View>
                  <Icono nombre="chevron-forward" tamano={18} />
                </Pressable>
              ))}
            </ScrollView>
          )}

          <Pressable onPress={onCerrar} style={styles.cerrar} accessibilityRole="button">
            <Text style={styles.cerrarTexto}>Cancelar</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fondo: {
    flex: 1,
    backgroundColor: 'rgba(34, 32, 28, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: espaciado.l,
  },
  panel: {
    width: '100%',
    maxWidth: 560,
    maxHeight: '85%',
    backgroundColor: colores.superficie,
    borderRadius: radios.l,
    padding: espaciado.l,
  },
  titulo: {
    fontFamily: tipografia.familias.cuerpoFuerte,
    fontSize: tipografia.escala.subtitulo,
    color: colores.tinta,
  },
  ayuda: {
    fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.escala.nota,
    color: colores.tintaSuave,
    lineHeight: 20,
    marginTop: 4,
    marginBottom: espaciado.m,
  },
  error: {
    fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.escala.nota,
    color: colores.alerta,
    marginBottom: espaciado.s,
  },
  subir: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: espaciado.s,
    minHeight: 52,
    borderRadius: radios.m,
    backgroundColor: colores.accion,
  },
  subirTexto: {
    fontFamily: tipografia.familias.cuerpoFuerte,
    fontSize: tipografia.escala.cuerpo,
    color: colores.accionTexto,
  },
  seccion: {
    fontFamily: tipografia.familias.cuerpoFuerte,
    fontSize: tipografia.escala.nota,
    color: colores.tintaSuave,
    marginTop: espaciado.l,
    marginBottom: espaciado.s,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cargando: { marginVertical: espaciado.m },
  lista: { flexGrow: 0 },
  vacio: {
    fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.escala.cuerpo,
    color: colores.tintaSuave,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.m,
    minHeight: 60,
    borderWidth: 1,
    borderColor: colores.linea,
    borderRadius: radios.m,
    paddingHorizontal: espaciado.m,
    marginBottom: espaciado.s,
    backgroundColor: colores.papel,
  },
  itemTextos: { flex: 1 },
  itemNombre: {
    fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.escala.cuerpo,
    color: colores.tinta,
  },
  itemDetalle: {
    fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.escala.nota,
    color: colores.tintaSuave,
    marginTop: 2,
  },
  cerrar: { alignSelf: 'flex-end', minHeight: 44, justifyContent: 'center', marginTop: espaciado.s },
  cerrarTexto: {
    fontFamily: tipografia.familias.cuerpoFuerte,
    fontSize: tipografia.escala.cuerpo,
    color: colores.tintaSuave,
  },
});
