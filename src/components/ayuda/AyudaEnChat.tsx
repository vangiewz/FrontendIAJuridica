import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { TemaAyuda } from '../../config/capacidadesAsistente';
import { explicarAyuda, notaDeChat } from '../../services/llamada/ayudaAsistente';
import { DISPONIBILIDAD } from '../../services/llamada/disponibilidadAsistente';
import { ListaCapacidades } from './ListaCapacidades';
import { colores, espaciado, radios, tipografia } from '../../theme';

interface Props {
  tema: TemaAyuda;
  /** Había un documento activo cuando se preguntó. */
  conDocumento: boolean;
}

/**
 * La respuesta del chat a «¿qué podés hacer?»: una introducción corta, la lista de capacidades (la misma
 * del panel de la llamada, sacada del catálogo) y dónde se pide cada cosa. Es local: no hubo consulta.
 */
export function AyudaEnChat({ tema, conDocumento }: Props) {
  const ayuda = explicarAyuda(tema, {
    documentoActivo: conDocumento, analisis: false, comparacion: false, generado: false, reporte: false,
  }, DISPONIBILIDAD);
  const general = ayuda.tema === 'general';

  return (
    <View style={styles.raiz} accessibilityLiveRegion="polite">
      <Text style={styles.titulo}>{ayuda.titulo}</Text>
      {ayuda.introduccion ? <Text style={styles.texto}>{ayuda.introduccion}</Text> : null}
      {ayuda.capacidades.length === 0 ? <Text style={styles.texto}>{ayuda.habla}</Text> : null}
      {ayuda.noDisponible.length > 0 && ayuda.capacidades.length > 0 ? (
        <Text style={styles.aviso}>{[...new Set(ayuda.noDisponible)].join(' ')}</Text>
      ) : null}
      <ListaCapacidades capacidades={ayuda.capacidades} maxEjemplos={general ? 2 : undefined} conDetalles={!general} />
      <Text style={styles.nota}>{notaDeChat(DISPONIBILIDAD)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  raiz: {
    alignSelf: 'stretch', gap: espaciado.s, marginTop: espaciado.m, padding: espaciado.m, borderRadius: radios.l,
    borderWidth: 1, borderColor: colores.linea, backgroundColor: colores.superficie,
  },
  titulo: { fontFamily: tipografia.familias.titulo, fontSize: tipografia.escala.subtitulo, color: colores.tinta },
  texto: { fontFamily: tipografia.familias.cuerpo, fontSize: tipografia.escala.cuerpo, lineHeight: 23, color: colores.tinta },
  aviso: { fontFamily: tipografia.familias.cuerpo, fontSize: tipografia.escala.nota, lineHeight: 20, color: colores.destacado },
  nota: { fontFamily: tipografia.familias.cuerpo, fontSize: tipografia.escala.nota, lineHeight: 20, color: colores.tintaSuave },
});
