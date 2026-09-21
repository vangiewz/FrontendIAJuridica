import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Consulta } from '../../models/consultas';
import { RespuestaIA } from '../consultas/RespuestaIA';
import { ListaFuentes } from '../consultas/ListaFuentes';
import { Aviso } from '../shared/Aviso';
import { Pestanas } from './Pestanas';
import { colores, espaciado, tipografia } from '../../theme';

interface Props {
  consulta: Consulta;
  /** Hay una pregunta nueva en curso: lo que se ve es la respuesta anterior. */
  hayNueva: boolean;
  /** El artículo se abre en un subnivel del mismo panel, no en otra pantalla. */
  alAbrirArticulo: (codigo: string, numero: number) => void;
}

type Vista = 'respuesta' | 'fuentes';

/**
 * «Respuesta y fuentes» dentro de la llamada: la misma respuesta y las mismas fuentes que
 * muestra la pantalla de la consulta (mismos componentes), con pestañas y sin navegar.
 */
export function ContenidoRespuesta({ consulta, hayNueva, alAbrirArticulo }: Props) {
  const [vista, setVista] = useState<Vista>('respuesta');
  const hayFuentes = consulta.fuentes.length > 0;
  const activa: Vista = vista === 'fuentes' && hayFuentes ? 'fuentes' : 'respuesta';

  return (
    <View style={styles.raiz}>
      <Pestanas activa={activa} onCambiar={setVista}
        pestanas={hayFuentes
          ? [{ clave: 'respuesta', etiqueta: 'Respuesta' },
             { clave: 'fuentes', etiqueta: `Fuentes (${consulta.fuentes.length})` }]
          : [{ clave: 'respuesta', etiqueta: 'Respuesta' }]} />
      <ScrollView contentContainerStyle={styles.scroll}>
        {hayNueva ? <Text style={styles.nota}>Estoy preparando una respuesta nueva; esta es la anterior.</Text> : null}
        <Text style={styles.pregunta} numberOfLines={3}>«{consulta.texto}»</Text>

        {activa === 'fuentes' ? (
          <ListaFuentes fuentes={consulta.fuentes} areaDetectada={consulta.area_juridica}
            alAbrirArticulo={alAbrirArticulo} />
        ) : consulta.respuesta ? (
          <RespuestaIA respuesta={consulta.respuesta} alAbrirArticulo={alAbrirArticulo} />
        ) : (
          <Text style={styles.nota}>
            {consulta.ia_error ?? 'Todavía no hay una explicación redactada para esta consulta.'}
          </Text>
        )}

        <View style={styles.aviso}>
          <Aviso tipo="info"
            mensaje="El sistema es una herramienta de apoyo y no sustituye el criterio profesional de un abogado. Toda respuesta jurídica debe ser verificada." />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  raiz: { flex: 1 },
  scroll: { paddingHorizontal: espaciado.m, paddingBottom: espaciado.xl },
  pregunta: {
    fontFamily: tipografia.familias.cuerpo, fontSize: tipografia.escala.nota, color: colores.tintaSuave,
    fontStyle: 'italic',
  },
  nota: {
    fontFamily: tipografia.familias.cuerpo, fontSize: tipografia.escala.nota, color: colores.tintaSuave,
    lineHeight: 20, marginBottom: espaciado.s,
  },
  aviso: { marginTop: espaciado.m },
});
