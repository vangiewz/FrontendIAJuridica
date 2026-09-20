import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { CampoPendiente, ConflictoDato, DatoDetectado } from '../../models/generacion';
import { colores, espaciado, radios, tipografia } from '../../theme';

interface Props {
  detectados: DatoDetectado[];
  pendientes: CampoPendiente[];
  conflictos: ConflictoDato[];
  descartados: string[];
  onResolver: (conflicto: ConflictoDato, reemplazar: boolean) => void;
}

/**
 * Lo que la IA saco del texto, lo que falta y lo que choca con algo ya cargado.
 *
 * Los tres bloques se muestran juntos a proposito: que un dato quede pendiente es
 * informacion tan util como que se haya detectado, porque el sistema no lo va a
 * completar por su cuenta.
 */
export function ResumenInterpretacion({
  detectados, pendientes, conflictos, descartados, onResolver,
}: Props) {
  const obligatorios = pendientes.filter((c) => c.obligatorio);
  const opcionales = pendientes.filter((c) => !c.obligatorio);

  return (
    <View>
      {detectados.length > 0 ? (
        <>
          <Text style={styles.encabezado}>Datos detectados</Text>
          {detectados.map((dato) => (
            <View key={dato.campo} style={styles.linea}>
              <Text style={styles.marcaOk}>✓</Text>
              <View style={styles.cuerpoLinea}>
                <Text style={styles.texto}>
                  <Text style={styles.etiqueta}>{dato.etiqueta}: </Text>
                  {dato.valor}
                </Text>
                {dato.evidencia ? (
                  <Text style={styles.evidencia}>de «{dato.evidencia}»</Text>
                ) : null}
              </View>
            </View>
          ))}
        </>
      ) : null}

      {conflictos.length > 0 ? (
        <>
          <Text style={styles.encabezado}>Valores que ya tenías cargados</Text>
          <Text style={styles.nota}>
            No se reemplazan solos. Elegí qué valor queda en el formulario.
          </Text>
          {conflictos.map((conflicto) => (
            <View key={conflicto.campo} style={styles.conflicto}>
              <Text style={styles.etiqueta}>
                {conflicto.etiqueta}
                {conflicto.explicito ? ' · cambio pedido' : ''}
              </Text>
              <Text style={styles.texto}>Actual: {conflicto.valor_actual}</Text>
              <Text style={styles.texto}>Detectado: {conflicto.valor_detectado}</Text>
              {conflicto.evidencia ? (
                <Text style={styles.evidencia}>de «{conflicto.evidencia}»</Text>
              ) : null}
              <View style={styles.acciones}>
                <Pressable
                  onPress={() => onResolver(conflicto, false)}
                  style={styles.botonChico}
                >
                  <Text style={styles.textoBotonChico}>Mantener actual</Text>
                </Pressable>
                <Pressable
                  onPress={() => onResolver(conflicto, true)}
                  style={[styles.botonChico, styles.botonReemplazar]}
                >
                  <Text style={[styles.textoBotonChico, styles.textoReemplazar]}>
                    Reemplazar
                  </Text>
                </Pressable>
              </View>
            </View>
          ))}
        </>
      ) : null}

      {pendientes.length > 0 ? (
        <>
          <Text style={styles.encabezado}>Datos pendientes</Text>
          {obligatorios.map((campo) => (
            <View key={campo.clave} style={styles.linea}>
              <Text style={styles.marcaPendiente}>○</Text>
              <Text style={styles.texto}>{campo.etiqueta}</Text>
            </View>
          ))}
          {opcionales.map((campo) => (
            <View key={campo.clave} style={styles.linea}>
              <Text style={styles.marcaPendiente}>○</Text>
              <Text style={styles.textoSuave}>{campo.etiqueta} (opcional)</Text>
            </View>
          ))}
        </>
      ) : null}

      {descartados.length > 0 ? (
        <Text style={styles.descartado}>
          No se cargaron por no aparecer en el texto: {descartados.join(', ')}.
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  encabezado: {
    fontFamily: tipografia.familias.cuerpoFuerte,
    fontSize: tipografia.escala.nota,
    color: colores.tinta,
    marginTop: espaciado.m,
    marginBottom: espaciado.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  linea: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: espaciado.xs },
  cuerpoLinea: { flex: 1 },
  marcaOk: {
    width: 18,
    color: colores.accion,
    fontFamily: tipografia.familias.cuerpoFuerte,
    fontSize: tipografia.escala.nota,
  },
  marcaPendiente: {
    width: 18,
    color: colores.tintaSuave,
    fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.escala.nota,
  },
  texto: {
    flex: 1,
    fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.escala.nota,
    color: colores.tinta,
  },
  textoSuave: {
    flex: 1,
    fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.escala.nota,
    color: colores.tintaSuave,
  },
  etiqueta: {
    fontFamily: tipografia.familias.cuerpoFuerte,
    color: colores.tintaSuave,
  },
  evidencia: {
    fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.escala.nota - 2,
    color: colores.tintaSuave,
    fontStyle: 'italic',
  },
  nota: {
    fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.escala.nota,
    color: colores.tintaSuave,
    marginBottom: espaciado.s,
  },
  conflicto: {
    borderWidth: 1,
    borderColor: colores.destacado,
    borderRadius: radios.s,
    padding: espaciado.m,
    marginBottom: espaciado.s,
    backgroundColor: colores.papel,
  },
  acciones: { flexDirection: 'row', gap: espaciado.s, marginTop: espaciado.s },
  botonChico: {
    borderWidth: 1,
    borderColor: colores.linea,
    borderRadius: radios.s,
    paddingVertical: espaciado.xs,
    paddingHorizontal: espaciado.m,
    backgroundColor: colores.superficie,
  },
  botonReemplazar: { backgroundColor: colores.accion, borderColor: colores.accion },
  textoBotonChico: {
    fontFamily: tipografia.familias.cuerpoFuerte,
    fontSize: tipografia.escala.nota,
    color: colores.tinta,
  },
  textoReemplazar: { color: colores.accionTexto },
  descartado: {
    fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.escala.nota,
    color: colores.areas.obligaciones,
    marginTop: espaciado.s,
  },
});
