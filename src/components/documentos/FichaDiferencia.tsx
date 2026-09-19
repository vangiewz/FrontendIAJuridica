import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colores, espaciado, radios, tipografia } from '../../theme';
import { Diferencia, TipoDiferencia, etiquetaDiferencia } from '../../models/documentos';

interface Props {
  diferencia: Diferencia;
}

const COLOR_TIPO: Record<TipoDiferencia, string> = {
  agregado: colores.accion,
  eliminado: colores.alerta,
  modificado: colores.destacado,
};

export function FichaDiferencia({ diferencia }: Props) {
  const color = COLOR_TIPO[diferencia.tipo] ?? colores.tintaSuave;

  return (
    <View style={[styles.ficha, { borderLeftColor: color }]}>
      <View style={styles.cabecera}>
        <Text style={[styles.tipo, { color }]}>{etiquetaDiferencia(diferencia.tipo)}</Text>
        <Text style={styles.ubicacion}>{diferencia.ubicacion}</Text>
      </View>

      {/* Los textos que no aplican llegan en null: un agregado no tiene "antes". */}
      {diferencia.texto_anterior ? (
        <View style={styles.version}>
          <Text style={styles.versionEtiqueta}>ANTES</Text>
          <Text style={styles.versionTexto} numberOfLines={6}>
            {diferencia.texto_anterior}
          </Text>
        </View>
      ) : null}

      {diferencia.texto_nuevo ? (
        <View style={styles.version}>
          <Text style={styles.versionEtiqueta}>DESPUÉS</Text>
          <Text style={styles.versionTexto} numberOfLines={6}>
            {diferencia.texto_nuevo}
          </Text>
        </View>
      ) : null}

      <View style={styles.cambio}>
        <Text style={styles.cambioEtiqueta}>Cambio</Text>
        <Text style={styles.cambioTexto}>{diferencia.explicacion}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  ficha: {
    borderLeftWidth: 4,
    borderTopWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderTopColor: colores.linea,
    borderRightColor: colores.linea,
    borderBottomColor: colores.linea,
    borderRadius: radios.s,
    padding: espaciado.m,
    marginBottom: espaciado.m,
  },
  cabecera: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: espaciado.s,
    marginBottom: espaciado.m,
  },
  tipo: {
    fontFamily: tipografia.familias.cuerpoFuerte,
    fontSize: tipografia.escala.nota,
    letterSpacing: 1,
  },
  ubicacion: {
    fontFamily: tipografia.familias.cuerpoFuerte,
    fontSize: tipografia.escala.nota,
    color: colores.tinta,
  },
  version: {
    marginBottom: espaciado.m,
  },
  versionEtiqueta: {
    fontFamily: tipografia.familias.cuerpoFuerte,
    fontSize: tipografia.escala.nota,
    color: colores.tintaSuave,
    letterSpacing: 1,
    marginBottom: espaciado.xs,
  },
  versionTexto: {
    fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.escala.nota,
    color: colores.tinta,
    lineHeight: 22,
    borderLeftWidth: 2,
    borderLeftColor: colores.linea,
    paddingLeft: espaciado.m,
  },
  cambio: {
    borderTopWidth: 1,
    borderTopColor: colores.linea,
    paddingTop: espaciado.m,
  },
  cambioEtiqueta: {
    fontFamily: tipografia.familias.cuerpoFuerte,
    fontSize: tipografia.escala.nota,
    color: colores.tintaSuave,
    marginBottom: espaciado.xs,
  },
  cambioTexto: {
    fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.escala.cuerpo,
    color: colores.tinta,
    lineHeight: 24,
  },
});
