import React from 'react';
import { TouchableOpacity, Text, View, StyleSheet } from 'react-native';
import { colores, espaciado, radios, tipografia } from '../../theme';
import { ItemHistorialLocal } from '../../models/shared/sincronizacion';
import { SelloEstado } from '../shared/SelloEstado';

interface Props {
  item: ItemHistorialLocal;
  onPress: () => void;
}

/** Una consulta previa en la lista del historial: de que trataba y cuanto la respaldo. */
export function FichaHistorial({ item, onPress }: Props) {
  const isPendiente = item.pendiente != null;
  const isFallida = isPendiente && item.pendiente?.estado === 'fallida';

  const Wrapper = isPendiente ? View : TouchableOpacity;
  const propsWrapper = isPendiente
    ? { accessibilityState: { disabled: true } }
    : { activeOpacity: 0.8, onPress };

  return (
    <Wrapper style={styles.card} {...propsWrapper as any}>
      {!isPendiente && (
        <Text style={styles.cardArea}>
          {item.area_juridica ? item.area_juridica.replace('_', ' ') : 'Área no detectada'}
        </Text>
      )}
      <Text style={styles.cardTexto} numberOfLines={2}>{item.texto}</Text>
      
      {isPendiente ? (
        <SelloEstado
          tono={isFallida ? 'fallo' : 'espera'}
          texto={isFallida ? 'No se pudo enviar' : 'Pendiente de envío'}
        />
      ) : (
        <View style={styles.cardFooter}>
          <Text style={styles.cardMeta}>{new Date(item.creada_en).toLocaleDateString()}</Text>
          <Text style={styles.cardMeta}>
            {item.cantidad_fuentes} {item.cantidad_fuentes === 1 ? 'fuente' : 'fuentes'}
          </Text>
        </View>
      )}
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colores.superficie,
    borderWidth: 1,
    borderColor: colores.linea,
    borderRadius: radios.m,
    padding: espaciado.l,
    marginBottom: espaciado.m,
  },
  cardArea: {
    fontFamily: tipografia.familias.cuerpoFuerte,
    fontSize: tipografia.escala.nota,
    color: colores.accion,
    marginBottom: espaciado.xs,
    textTransform: 'capitalize',
  },
  cardTexto: {
    fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.escala.cuerpo,
    color: colores.tinta,
    marginBottom: espaciado.m,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cardMeta: {
    fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.escala.nota,
    color: colores.tintaSuave,
  },
});
