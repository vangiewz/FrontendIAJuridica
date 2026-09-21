import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Aviso } from '../shared/Aviso';
import { TextoConPendientes } from '../generacion/TextoConPendientes';
import { DocumentoGenerado, FORMATOS_BORRADOR, FormatoBorrador } from '../../models/generacion';
import { descargaDisponible } from '../../services/descargas';
import { nombreTipoGenerado } from '../../services/llamada/resumenVoz';
import { BarraSalida } from './BarraSalida';
import type { SalidaLlamada } from '../../controllers/llamada/useSalidaLlamada';
import { colores, espaciado, radios, tipografia } from '../../theme';

interface Props {
  documento: DocumentoGenerado;
  exportando: string | null;
  aviso: string | null;
  alExportar: (formato: FormatoBorrador) => void;
  /** Guardar y compartir en el teléfono. */
  salida: SalidaLlamada;
}

/**
 * La vista previa del documento generado: el mismo texto y los mismos huecos marcados que
 * el borrador de la pantalla Generar. Un dato que falta se ve resaltado, nunca disimulado.
 * Los cambios se piden hablando («cambia el plazo a 18 meses») y dan una versión nueva.
 */
export function ContenidoGenerado({ documento, exportando, aviso, alExportar, salida }: Props) {
  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <Text style={styles.titulo}>
        {`Borrador de ${nombreTipoGenerado(documento.tipo_documento)} — versión ${documento.version}`}
      </Text>

      {documento.campos_faltantes.length > 0 ? (
        <Aviso tipo="error"
          mensaje={`Faltan datos que el sistema no completa solo: ${documento.campos_faltantes.join(', ')}. Aparecen marcados en el texto.`} />
      ) : null}
      {documento.ia_error ? <Aviso tipo="info" mensaje={documento.ia_error} /> : null}

      <TextoConPendientes contenido={documento.contenido} />

      {descargaDisponible ? (
        <>
          <View style={styles.exportacion}>
            <Text style={styles.etiqueta}>Descargar esta versión:</Text>
            {FORMATOS_BORRADOR.map(({ formato, etiqueta }) => (
              <Pressable key={formato} onPress={() => alExportar(formato)} disabled={exportando !== null}
                accessibilityRole="button" style={styles.formato}>
                <Text style={styles.formatoTexto}>{exportando === formato ? 'Generando…' : etiqueta}</Text>
              </Pressable>
            ))}
          </View>
          {aviso ? <Text style={styles.error}>{aviso}</Text> : null}
        </>
      ) : (
        <BarraSalida formatos={['pdf', 'docx']}
          preparando={salida.preparando?.objeto === 'generado' ? salida.preparando : null}
          resultado={salida.resultado?.objeto === 'generado' ? salida.resultado : null}
          alGuardar={(f) => { void salida.ejecutar('generado', 'guardar', f); }}
          alCompartir={(f) => { void salida.ejecutar('generado', 'compartir', f); }} />
      )}

      <Text style={styles.nota}>
        Para modificarlo, dímelo hablando: por ejemplo «cambia el plazo a 18 meses». Se guarda como una
        versión nueva y la anterior se conserva.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: espaciado.m, paddingBottom: espaciado.xl, gap: espaciado.s },
  titulo: { fontFamily: tipografia.familias.titulo, fontSize: tipografia.escala.subtitulo, color: colores.tinta },
  exportacion: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: espaciado.s, marginTop: espaciado.s },
  etiqueta: { fontFamily: tipografia.familias.cuerpoFuerte, fontSize: tipografia.escala.nota, color: colores.tintaSuave },
  formato: {
    minHeight: 44, justifyContent: 'center', borderWidth: 1, borderColor: colores.linea, borderRadius: radios.s,
    paddingHorizontal: espaciado.m, backgroundColor: colores.superficie,
  },
  formatoTexto: { fontFamily: tipografia.familias.cuerpoFuerte, fontSize: tipografia.escala.nota, color: colores.tinta },
  nota: { fontFamily: tipografia.familias.cuerpo, fontSize: tipografia.escala.nota, color: colores.tintaSuave, lineHeight: 20 },
  error: { fontFamily: tipografia.familias.cuerpo, fontSize: tipografia.escala.nota, color: colores.alerta },
});
