import React from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { ResultadoReporte } from '../reportes/ResultadoReporte';
import { FormatoExportacion, ReporteResultado } from '../../models/reportes';
import { BarraSalida } from './BarraSalida';
import { descargaDisponible } from '../../services/descargas';
import type { SalidaLlamada } from '../../controllers/llamada/useSalidaLlamada';
import { colores, espaciado, tipografia } from '../../theme';

interface Props {
  reporte: ReporteResultado;
  exportando: string | null;
  aviso: string | null;
  alExportar: (formato: FormatoExportacion) => void;
  /** Guardar y compartir en el teléfono. */
  salida: SalidaLlamada;
}

/**
 * El reporte que devolvió el motor de reportes, con el mismo componente de la pantalla
 * Reportes (tabla, gráfico o resumen). No se pasa `onAbrirFila`: abrir una fila navegaría
 * fuera de la llamada, así que en el panel las filas no se abren.
 */
export function ContenidoReporte({ reporte, exportando, aviso, alExportar, salida }: Props) {
  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <ResultadoReporte reporte={reporte} onExportar={alExportar} sinExportacion={!descargaDisponible}
        exportando={exportando as FormatoExportacion | null} />
      {descargaDisponible ? (
        aviso ? <Text style={styles.error}>{aviso}</Text> : null
      ) : (
        <BarraSalida formatos={['pdf', 'docx', 'xlsx', 'pptx']}
          preparando={salida.preparando?.objeto === 'reporte' ? salida.preparando : null}
          resultado={salida.resultado?.objeto === 'reporte' ? salida.resultado : null}
          alGuardar={(f) => { void salida.ejecutar('reporte', 'guardar', f); }}
          alCompartir={(f) => { void salida.ejecutar('reporte', 'compartir', f); }} />
      )}
      <Text style={styles.nota}>
        Puedes pedirme un ajuste hablando: «muéstralo como gráfico de barras», «ordénalos de mayor a menor».
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: espaciado.m, paddingBottom: espaciado.xl },
  nota: {
    fontFamily: tipografia.familias.cuerpo, fontSize: tipografia.escala.nota, color: colores.tintaSuave,
    lineHeight: 20, marginTop: espaciado.m,
  },
  error: { fontFamily: tipografia.familias.cuerpo, fontSize: tipografia.escala.nota, color: colores.alerta, marginTop: espaciado.s },
});
