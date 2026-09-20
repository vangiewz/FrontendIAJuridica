import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colores, espaciado, radios, tipografia } from '../../../theme';

interface Props {
  numero: number;
  titulo: string;
  ayuda?: string;
  /** Se atenua mientras el paso no se puede usar todavia. */
  inactivo?: boolean;
  children: React.ReactNode;
}

/**
 * Una etapa del constructor, con su numero y una pregunta en lugar de un titulo tecnico.
 *
 * El numero es lo que da sensacion de recorrido: se entiende que hay un orden y en que
 * punto esta uno, sin tener que leer nada.
 */
export function Paso({ numero, titulo, ayuda, inactivo, children }: Props) {
  return (
    <View style={[styles.paso, inactivo && styles.inactivo]}>
      <View style={styles.cabecera}>
        <View style={[styles.numero, inactivo && styles.numeroInactivo]}>
          <Text style={[styles.numeroTexto, inactivo && styles.numeroTextoInactivo]}>
            {numero}
          </Text>
        </View>
        <View style={styles.textos}>
          <Text style={styles.titulo}>{titulo}</Text>
          {ayuda ? <Text style={styles.ayuda}>{ayuda}</Text> : null}
        </View>
      </View>
      <View style={styles.cuerpo}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  paso: { marginBottom: espaciado.xl },
  inactivo: { opacity: 0.55 },
  cabecera: { flexDirection: 'row', alignItems: 'flex-start', gap: espaciado.m },
  numero: {
    width: 36,
    height: 36,
    borderRadius: radios.round,
    backgroundColor: colores.accion,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numeroInactivo: { backgroundColor: colores.linea },
  numeroTexto: {
    fontFamily: tipografia.familias.cuerpoFuerte,
    fontSize: tipografia.escala.cuerpo,
    color: colores.accionTexto,
  },
  numeroTextoInactivo: { color: colores.tintaSuave },
  textos: { flex: 1 },
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
  },
  cuerpo: { marginTop: espaciado.m, marginLeft: 36 + espaciado.m },
});
