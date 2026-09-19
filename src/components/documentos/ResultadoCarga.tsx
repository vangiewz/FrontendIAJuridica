import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colores, espaciado, radios, tipografia } from '../../theme';
import { Documento } from '../../models/documentos';
import { EtiquetaTipoDocumento } from './EtiquetaTipoDocumento';

interface Props {
  documento: Documento;
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <View style={styles.fila}>
      <Text style={styles.etiqueta}>{etiqueta}</Text>
      <Text style={styles.valor}>{valor}</Text>
    </View>
  );
}

/**
 * Lo que el backend hizo con el documento.
 *
 * `estado: 'fallido'` llega con HTTP 201: el documento se guardo pero no se le pudo
 * sacar texto (tipicamente un PDF escaneado). No es un error de la peticion, pero
 * tampoco es un exito, y se muestra distinto para que el usuario sepa que hacer.
 */
export function ResultadoCarga({ documento }: Props) {
  const fallido = documento.estado === 'fallido';

  return (
    <View style={[styles.card, fallido && styles.cardFallido]}>
      <Text style={[styles.titulo, fallido && styles.tituloFallido]}>
        {fallido ? 'No se pudo leer el documento' : 'Documento procesado correctamente'}
      </Text>

      <Text style={styles.nombre} numberOfLines={2}>{documento.nombre_archivo}</Text>

      {fallido && documento.motivo_fallo ? (
        <Text style={styles.motivo}>{documento.motivo_fallo}</Text>
      ) : null}

      {/* Un documento fallido nunca llego al clasificador: no se muestra tipo. */}
      {!fallido ? <EtiquetaTipoDocumento tipo={documento.tipo_documento} /> : null}

      <View style={styles.datos}>
        <Dato etiqueta="Estado" valor={fallido ? 'Fallido' : 'Procesado'} />
        {documento.terminos_detectados.length > 0 ? (
          <Dato
            etiqueta="Términos que determinaron el tipo"
            valor={documento.terminos_detectados.join(', ')}
          />
        ) : null}
        {documento.cantidad_caracteres !== null ? (
          <Dato
            etiqueta="Texto extraído"
            valor={`${documento.cantidad_caracteres.toLocaleString()} caracteres`}
          />
        ) : null}
        <Dato etiqueta="Identificador" valor={documento.id} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colores.superficie,
    borderWidth: 1,
    borderColor: colores.accion,
    borderRadius: radios.m,
    padding: espaciado.l,
    marginBottom: espaciado.l,
  },
  cardFallido: {
    borderColor: colores.destacado,
  },
  titulo: {
    fontFamily: tipografia.familias.cuerpoFuerte,
    fontSize: tipografia.escala.subtitulo,
    color: colores.accion,
    marginBottom: espaciado.xs,
  },
  tituloFallido: {
    color: colores.destacado,
  },
  nombre: {
    fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.escala.cuerpo,
    color: colores.tinta,
    marginBottom: espaciado.m,
  },
  motivo: {
    fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.escala.nota,
    color: colores.tinta,
    lineHeight: 20,
    marginBottom: espaciado.m,
  },
  datos: {
    gap: espaciado.s,
  },
  fila: {
    borderTopWidth: 1,
    borderTopColor: colores.linea,
    paddingTop: espaciado.s,
  },
  etiqueta: {
    fontFamily: tipografia.familias.cuerpoFuerte,
    fontSize: tipografia.escala.nota,
    color: colores.tintaSuave,
    marginBottom: espaciado.xs,
  },
  valor: {
    fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.escala.nota,
    color: colores.tinta,
  },
});
