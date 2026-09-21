import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Icono } from '../shared/Icono';
import { Ejemplos, ListaCapacidades } from '../ayuda/ListaCapacidades';
import { TemaAyuda } from '../../config/capacidadesAsistente';
import { explicarAyuda } from '../../services/llamada/ayudaAsistente';
import { DISPONIBILIDAD } from '../../services/llamada/disponibilidadAsistente';
import { contextoDeAyuda } from '../../controllers/llamada/useAyudaLlamada';
import type { AccionesLlamada } from '../../controllers/llamada/useAccionesLlamada';
import { colores, espaciado, radios, tipografia } from '../../theme';

interface Props {
  tema: TemaAyuda;
  acciones: AccionesLlamada;
  /** Pasa a mostrar todas las funciones (desde una ayuda parcial). */
  alVerTodo: () => void;
}

/**
 * El panel «¿Qué puedo hacer?»: el catálogo de capacidades, completo o de un solo tema, con frases para
 * pedir cada cosa. Se calcula EN el momento con lo que la llamada tiene (un documento, un reporte…),
 * así lo relacionado con eso se destaca arriba sin esconder el resto. No llama a la voz.
 */
export function ContenidoAyuda({ tema, acciones, alVerTodo }: Props) {
  const ayuda = explicarAyuda(tema, contextoDeAyuda(acciones.contexto()), DISPONIBILIDAD);
  const parcial = ayuda.tema !== 'general';

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      {ayuda.introduccion ? <Text style={styles.intro}>{ayuda.introduccion}</Text> : null}

      {ayuda.contextuales.length > 0 ? (
        <View style={styles.ahora}>
          <Text style={styles.ahoraTitulo}>Con lo que tenés ahora</Text>
          <Ejemplos ejemplos={ayuda.contextuales} />
        </View>
      ) : null}

      {ayuda.noDisponible.length > 0 ? (
        <Text style={styles.aviso}>{[...new Set(ayuda.noDisponible)].join(' ')}</Text>
      ) : null}

      <ListaCapacidades capacidades={ayuda.capacidades} maxEjemplos={parcial ? undefined : 3} />

      {parcial ? (
        <Pressable onPress={alVerTodo} accessibilityRole="button" style={styles.verTodo}>
          <Icono nombre="list-outline" tamano={18} color={colores.accion} />
          <Text style={styles.verTodoTexto}>Ver todas mis funciones</Text>
        </Pressable>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: espaciado.m, paddingBottom: espaciado.xl, gap: espaciado.s },
  intro: { fontFamily: tipografia.familias.cuerpo, fontSize: tipografia.escala.nota, lineHeight: 21, color: colores.tintaSuave },
  ahora: {
    gap: espaciado.xs, padding: espaciado.m, borderRadius: radios.m, borderWidth: 1, borderColor: colores.accion,
    backgroundColor: colores.superficie,
  },
  ahoraTitulo: { fontFamily: tipografia.familias.cuerpoFuerte, fontSize: tipografia.escala.nota, color: colores.accion },
  aviso: {
    fontFamily: tipografia.familias.cuerpo, fontSize: tipografia.escala.nota, lineHeight: 20, color: colores.destacado,
    borderLeftWidth: 3, borderLeftColor: colores.destacado, paddingLeft: espaciado.s,
  },
  verTodo: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: espaciado.s, minHeight: 48,
    borderRadius: radios.m, borderWidth: 1, borderColor: colores.accion,
  },
  verTodoTexto: { fontFamily: tipografia.familias.cuerpoFuerte, fontSize: tipografia.escala.cuerpo, color: colores.accion },
});
