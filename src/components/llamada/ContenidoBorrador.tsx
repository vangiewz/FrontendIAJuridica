import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { BorradorEnCurso } from '../../models/llamada';
import { nombreTipoGenerado } from '../../services/llamada/resumenVoz';
import { colores, espaciado, radios, tipografia } from '../../theme';

interface Props {
  borrador: BorradorEnCurso;
  alCancelar: () => void;
}

const legible = (clave: string) => clave.replace(/_/g, ' ');

/**
 * El documento que se está preparando por voz: qué tipo es, qué datos ya se dieron y cuál
 * falta. Las preguntas las hace el asistente en voz alta; aquí solo se ve el avance. Los
 * datos que el usuario deja pendientes se marcarán [FALTA: …] en el borrador: no se inventan.
 */
export function ContenidoBorrador({ borrador, alCancelar }: Props) {
  const dados = Object.entries(borrador.datos).filter(([, valor]) => valor.trim());
  const faltan = borrador.pendientes.filter((p) => !borrador.omitidos.includes(p.clave));

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <Text style={styles.titulo}>
        {borrador.tipo ? `Documento de ${nombreTipoGenerado(borrador.tipo)}` : 'Elige el tipo de documento'}
      </Text>

      {borrador.preguntando ? (
        <View style={styles.pregunta}>
          <Text style={styles.preguntaEtiqueta}>Te estoy preguntando</Text>
          <Text style={styles.preguntaTexto}>{borrador.preguntando.etiqueta}</Text>
        </View>
      ) : null}

      {dados.length > 0 ? (
        <Bloque titulo="Datos que ya tengo">
          {dados.map(([clave, valor]) => (
            <Text key={clave} style={styles.linea}><Text style={styles.clave}>{legible(clave)}: </Text>{valor}</Text>
          ))}
        </Bloque>
      ) : null}

      {faltan.length > 0 ? (
        <Bloque titulo="Todavía faltan">
          {faltan.map((p) => (
            <Text key={p.clave} style={styles.linea}>
              — {p.etiqueta}{p.obligatorio ? '' : ' (opcional)'}
            </Text>
          ))}
        </Bloque>
      ) : null}

      <Text style={styles.nota}>
        Puedes decir «no sé» para dejar un dato pendiente, «generalo así» para redactarlo ya, o «cancelar».
      </Text>
      <Pressable onPress={alCancelar} accessibilityRole="button" style={styles.cancelar}>
        <Text style={styles.cancelarTexto}>Cancelar la generación</Text>
      </Pressable>
    </ScrollView>
  );
}

function Bloque({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <View style={styles.bloque}>
      <Text style={styles.bloqueTitulo}>{titulo}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: espaciado.m, paddingBottom: espaciado.xl, gap: espaciado.m },
  titulo: { fontFamily: tipografia.familias.titulo, fontSize: tipografia.escala.subtitulo, color: colores.tinta },
  pregunta: {
    borderLeftWidth: 3, borderLeftColor: colores.destacado, backgroundColor: colores.papel,
    padding: espaciado.m, borderRadius: radios.s, gap: 2,
  },
  preguntaEtiqueta: { fontFamily: tipografia.familias.cuerpoFuerte, fontSize: tipografia.escala.nota, color: colores.tintaSuave },
  preguntaTexto: { fontFamily: tipografia.familias.cuerpoFuerte, fontSize: tipografia.escala.cuerpo, color: colores.tinta },
  bloque: {
    borderWidth: 1, borderColor: colores.linea, borderRadius: radios.m, padding: espaciado.m,
    backgroundColor: colores.papel, gap: espaciado.xs,
  },
  bloqueTitulo: {
    fontFamily: tipografia.familias.cuerpoFuerte, fontSize: tipografia.escala.nota, color: colores.tintaSuave,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  linea: { fontFamily: tipografia.familias.cuerpo, fontSize: tipografia.escala.nota, color: colores.tinta, lineHeight: 21 },
  clave: { fontFamily: tipografia.familias.cuerpoFuerte, textTransform: 'capitalize' },
  nota: { fontFamily: tipografia.familias.cuerpo, fontSize: tipografia.escala.nota, color: colores.tintaSuave, lineHeight: 20 },
  cancelar: { alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center' },
  cancelarTexto: { fontFamily: tipografia.familias.cuerpoFuerte, fontSize: tipografia.escala.nota, color: colores.alerta },
});
