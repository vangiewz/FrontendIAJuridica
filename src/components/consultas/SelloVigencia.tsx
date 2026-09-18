import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { EstadoVigencia } from '../../models/consultas';
import { colores, radios, espaciado, tipografia } from '../../theme';

interface Props {
  estado: EstadoVigencia;
}

export function SelloVigencia({ estado }: Props) {
  let texto = 'Vigencia sin verificar';
  let esAlerta = false;

  if (estado === 'vigente') texto = 'Vigente';
  else if (estado === 'derogado') {
    texto = 'Derogado';
    esAlerta = true;
  } else if (estado === 'modificado') {
    texto = 'Modificado';
  }

  return (
    <View style={[styles.contenedor, esAlerta && styles.contenedorAlerta]}>
      <Text style={[styles.texto, esAlerta && styles.textoAlerta]}>{texto}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    borderWidth: 1,
    borderColor: colores.linea,
    borderRadius: radios.s,
    paddingVertical: espaciado.xs,
    paddingHorizontal: espaciado.s,
    alignSelf: 'flex-start',
  },
  contenedorAlerta: {
    borderColor: colores.alerta,
  },
  texto: {
    fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.escala.nota,
    color: colores.tintaSuave,
  },
  textoAlerta: {
    color: colores.alerta,
  },
});
