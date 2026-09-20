import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { colores, espaciado, interlineado, radios, tipografia } from '../../theme';

interface Props {
  contenido: string;
}

// El backend marca los datos ausentes con [FALTA: etiqueta]; aca solo se resaltan.
const MARCADOR = /(\[FALTA:\s*[^\]]+\])/g;

/**
 * El borrador con los datos que faltan a la vista.
 *
 * Un documento al que le faltan datos no puede parecer terminado: el hueco se resalta
 * en vez de disimularse, para que nadie lo firme creyendo que esta completo.
 */
export function TextoConPendientes({ contenido }: Props) {
  const partes = (contenido || '').split(MARCADOR);
  return (
    <Text style={styles.documento}>
      {partes.map((parte, indice) =>
        // No se usa MARCADOR.test: una regex con /g arrastra lastIndex entre llamadas
        // y devolveria true y false alternados sobre las mismas partes.
        parte.startsWith('[FALTA:') ? (
          <Text key={indice} style={styles.pendiente}>
            {parte}
          </Text>
        ) : (
          <Text key={indice}>{parte}</Text>
        ),
      )}
    </Text>
  );
}

const styles = StyleSheet.create({
  documento: {
    fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.escala.nota,
    color: colores.tinta,
    lineHeight: interlineado.cuerpo,
    backgroundColor: colores.papel,
    borderWidth: 1,
    borderColor: colores.linea,
    borderRadius: radios.s,
    padding: espaciado.m,
    marginTop: espaciado.m,
  },
  pendiente: {
    fontFamily: tipografia.familias.cuerpoFuerte,
    color: colores.alerta,
    backgroundColor: colores.linea,
  },
});
