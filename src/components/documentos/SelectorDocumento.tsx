import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colores, espaciado, radios, tipografia } from '../../theme';
import { ItemDocumento, describirTipoDocumento } from '../../models/documentos';

interface Props {
  rotulo: string;
  documentos: ItemDocumento[];
  seleccionadoId: string | null;
  onElegir: (id: string) => void;
}

/** Lista de documentos ya cargados para elegir uno. No vuelve a pedir el archivo. */
export function SelectorDocumento({ rotulo, documentos, seleccionadoId, onElegir }: Props) {
  return (
    <View style={styles.bloque}>
      <Text style={styles.rotulo}>{rotulo}</Text>
      {documentos.map((documento) => {
        const elegido = documento.id === seleccionadoId;
        const { etiqueta } = describirTipoDocumento(documento.tipo_documento);

        return (
          <TouchableOpacity
            key={documento.id}
            style={[styles.opcion, elegido && styles.opcionElegida]}
            activeOpacity={0.8}
            onPress={() => onElegir(documento.id)}
          >
            <Text style={[styles.nombre, elegido && styles.nombreElegido]} numberOfLines={1}>
              {documento.nombre_archivo}
            </Text>
            <Text style={styles.meta}>
              {etiqueta} · {new Date(documento.subido_en).toLocaleDateString()}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bloque: {
    marginBottom: espaciado.l,
  },
  rotulo: {
    fontFamily: tipografia.familias.cuerpoFuerte,
    fontSize: tipografia.escala.nota,
    color: colores.tintaSuave,
    letterSpacing: 1,
    marginBottom: espaciado.s,
  },
  opcion: {
    borderWidth: 1,
    borderColor: colores.linea,
    borderRadius: radios.s,
    backgroundColor: colores.superficie,
    padding: espaciado.m,
    marginBottom: espaciado.s,
  },
  opcionElegida: {
    borderColor: colores.accion,
    borderWidth: 2,
  },
  nombre: {
    fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.escala.cuerpo,
    color: colores.tinta,
  },
  nombreElegido: {
    fontFamily: tipografia.familias.cuerpoFuerte,
    color: colores.accion,
  },
  meta: {
    fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.escala.nota,
    color: colores.tintaSuave,
    marginTop: espaciado.xs,
  },
});
