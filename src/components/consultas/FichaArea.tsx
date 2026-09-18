import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { colores, tipografia, espaciado, radios } from '../../theme';
import { AreaJuridica } from '../../models/consultas';

// El tema nombra las areas en camelCase y la API las devuelve en snake_case.
// El mapeo vive solo aca para que ninguna vista tenga que conocer las dos formas.
// responsabilidad_civil comparte el color de obligaciones: DESIGN.md define la terracota
// como "Obligaciones y responsabilidad civil", asi que no se inventa un quinto color.
const CLAVE_TEMA: Record<AreaJuridica, keyof typeof colores.areas> = {
  contratos: 'contratos',
  obligaciones: 'obligaciones',
  derechos_reales: 'derechosReales',
  sucesiones: 'sucesiones',
  responsabilidad_civil: 'obligaciones',
};

interface Props {
  area: AreaJuridica;
  titulo: string;
  activa: boolean;
  onPress: () => void;
}

export function FichaArea({ area, titulo, activa, onPress }: Props) {
  const colorArea = colores.areas[CLAVE_TEMA[area]];
  
  return (
    <TouchableOpacity
      style={[
        styles.ficha,
        activa ? { backgroundColor: colorArea } : styles.fichaInactiva
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={[
        styles.texto,
        activa ? styles.textoActivo : styles.textoInactivo
      ]}>
        {titulo}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  ficha: {
    paddingVertical: espaciado.s,
    paddingHorizontal: espaciado.m,
    borderRadius: radios.m,
    marginRight: espaciado.s,
    marginBottom: espaciado.s,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  fichaInactiva: {
    backgroundColor: 'transparent',
    borderColor: colores.linea,
  },
  texto: {
    fontFamily: tipografia.familias.cuerpoFuerte,
    fontSize: tipografia.escala.nota,
  },
  textoActivo: {
    color: colores.superficie,
  },
  textoInactivo: {
    color: colores.tintaSuave,
  },
});
