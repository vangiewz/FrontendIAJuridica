import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { colores, tipografia, espaciado, radios } from '../../theme';

interface Props {
  titulo: string;
  onPress: () => void;
  cargando?: boolean;
  variante?: 'primario' | 'secundario' | 'peligro';
}

export function Boton({ titulo, onPress, cargando, variante = 'primario' }: Props) {
  const isPeligro = variante === 'peligro';
  const isSecundario = variante === 'secundario';

  return (
    <TouchableOpacity
      style={[
        styles.boton,
        isPeligro && styles.botonPeligro,
        isSecundario && styles.botonSecundario,
      ]}
      onPress={onPress}
      disabled={cargando}
    >
      {cargando ? (
        <ActivityIndicator color={isSecundario ? colores.tinta : colores.accionTexto} />
      ) : (
        <Text style={[
          styles.texto,
          isPeligro && styles.textoPeligro,
          isSecundario && styles.textoSecundario,
        ]}>
          {titulo}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  boton: {
    backgroundColor: colores.accion,
    paddingVertical: espaciado.m,
    paddingHorizontal: espaciado.l,
    borderRadius: radios.m,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botonPeligro: {
    backgroundColor: colores.alerta,
  },
  botonSecundario: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colores.linea,
  },
  texto: {
    color: colores.accionTexto,
    fontFamily: tipografia.familias.cuerpoFuerte,
    fontSize: tipografia.escala.cuerpo,
  },
  textoPeligro: {
    color: colores.superficie,
  },
  textoSecundario: {
    color: colores.tinta,
  },
});
