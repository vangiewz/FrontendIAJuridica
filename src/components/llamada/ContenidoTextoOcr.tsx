import React from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { armarTextoEscaneo, PaginaEscaneada } from '../../services/escaner/escanerPuro';
import { colores, espaciado, interlineado, radios, tipografia } from '../../theme';

/**
 * El texto reconocido, completo y con la página de la que salió cada parte. Es lo que leyó
 * el OCR, sin corregir: si una palabra salió mal, aquí se ve tal cual.
 */
export function ContenidoTextoOcr({ paginas }: { paginas: PaginaEscaneada[] }) {
  const texto = armarTextoEscaneo(paginas);
  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <Text style={styles.nota}>Texto tal como lo reconoció el teléfono; no está corregido.</Text>
      <Text style={styles.texto} selectable>{texto || 'No se reconoció texto.'}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: espaciado.m, paddingBottom: espaciado.xl, gap: espaciado.s },
  nota: { fontFamily: tipografia.familias.cuerpo, fontSize: tipografia.escala.nota, color: colores.tintaSuave },
  texto: {
    fontFamily: tipografia.familias.cuerpo, fontSize: tipografia.escala.nota, lineHeight: interlineado.cuerpo - 3,
    color: colores.tinta, backgroundColor: colores.papel, borderWidth: 1, borderColor: colores.linea,
    borderRadius: radios.s, padding: espaciado.m,
  },
});
