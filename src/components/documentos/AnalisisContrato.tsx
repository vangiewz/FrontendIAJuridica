import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colores, espaciado, radios, tipografia } from '../../theme';
import {
  Analisis,
  Clausula,
  contarDatosEnClausula,
  describirTipoDocumento,
  tieneReglasPropias,
} from '../../models/documentos';

interface Props {
  analisis: Analisis;
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <View style={styles.dato}>
      <Text style={styles.datoEtiqueta}>{etiqueta}</Text>
      <Text style={styles.datoValor}>{valor}</Text>
    </View>
  );
}

/**
 * Una clausula como pieza de la estructura: donde esta, cuanto ocupa y cuantos
 * datos juridicos contiene. El fragmento de texto para lectura lo muestra la
 * seccion de informacion extraida; aca interesa la estructura.
 */
function FilaClausula({ clausula, datos }: { clausula: Clausula; datos: number }) {
  return (
    <View style={styles.fila}>
      <Text style={styles.filaOrden}>{clausula.orden}</Text>
      <View style={styles.filaCuerpo}>
        <Text style={styles.filaEncabezado} numberOfLines={2}>
          {clausula.encabezado}
        </Text>
        <Text style={styles.filaMetricas}>
          {clausula.fin - clausula.inicio} caracteres
          {datos > 0 ? ` · ${datos} ${datos === 1 ? 'dato detectado' : 'datos detectados'}` : ''}
        </Text>
      </View>
    </View>
  );
}

export function AnalisisContrato({ analisis }: Props) {
  const { etiqueta } = describirTipoDocumento(analisis.tipo_documento);

  // El backend corre el motor igual, pero sin reconocer un tipo contractual solo
  // aplica las reglas comunes: no hay analisis contractual del que hablar.
  if (analisis.tipo_documento === 'otro') {
    return (
      <View style={styles.card}>
        <Text style={styles.titulo}>ANÁLISIS DEL CONTRATO</Text>
        <Text style={styles.vacio}>
          No se pudo realizar un análisis contractual porque el documento no fue identificado
          como un contrato civil soportado.
        </Text>
      </View>
    );
  }

  const reglasPropias = tieneReglasPropias(analisis.tipo_documento);

  return (
    <View style={styles.card}>
      <Text style={styles.titulo}>ANÁLISIS DEL CONTRATO</Text>

      <Dato etiqueta="Tipo de contrato analizado" valor={etiqueta} />
      <Dato
        etiqueta="Cláusulas detectadas"
        valor={String(analisis.clausulas.length)}
      />

      {analisis.clausulas.length > 0 ? (
        <View style={styles.bloque}>
          <Text style={styles.bloqueTitulo}>Estructura contractual</Text>
          {analisis.clausulas.map((clausula) => (
            <FilaClausula
              key={clausula.orden}
              clausula={clausula}
              datos={contarDatosEnClausula(analisis, clausula.orden)}
            />
          ))}
        </View>
      ) : (
        <Text style={styles.nota}>
          No se reconocieron encabezados de cláusulas en el formato de este documento.
        </Text>
      )}

      {analisis.resumen ? (
        <View style={styles.bloque}>
          <Text style={styles.bloqueTitulo}>Resumen del contrato</Text>
          <Text style={styles.textoLargo}>{analisis.resumen}</Text>
          <Text style={styles.selloIA}>Redactado por la IA local a partir de las cláusulas</Text>
        </View>
      ) : null}

      {analisis.observaciones.length > 0 ? (
        <View style={styles.bloque}>
          <Text style={styles.bloqueTitulo}>Observaciones de la IA</Text>
          <Text style={styles.nota}>
            No son riesgos del motor de reglas: son puntos a revisar que el modelo señaló,
            cada uno anclado a una parte literal del contrato.
          </Text>
          {analisis.observaciones.map((obs, i) => (
            <View key={i} style={styles.observacion}>
              <Text style={styles.textoLargo}>{obs.observacion}</Text>
              <Text style={styles.evidencia}>“{obs.evidencia}”</Text>
            </View>
          ))}
        </View>
      ) : null}

      <View style={styles.bloque}>
        <Text style={styles.bloqueTitulo}>Estado del análisis</Text>
        <Dato etiqueta="Estado" valor="Analizado" />
        <Dato
          etiqueta="Reglas contractuales evaluadas"
          valor={
            reglasPropias
              ? `${analisis.reglas_evaluadas} (comunes y propias del tipo)`
              : `${analisis.reglas_evaluadas} (solo reglas comunes)`
          }
        />
        <Dato etiqueta="Analizado el" valor={new Date(analisis.creado_en).toLocaleString()} />
        {analisis.ia_error ? (
          <Text style={styles.nota}>
            No se pudo generar el resumen con la IA local: {analisis.ia_error} El análisis
            estructural y los riesgos por reglas no dependen de la IA y siguen vigentes.
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colores.superficie,
    borderWidth: 1,
    borderColor: colores.linea,
    borderRadius: radios.m,
    padding: espaciado.l,
    marginBottom: espaciado.l,
  },
  titulo: {
    fontFamily: tipografia.familias.cuerpoFuerte,
    fontSize: tipografia.escala.nota,
    color: colores.tintaSuave,
    letterSpacing: 1,
    marginBottom: espaciado.l,
  },
  vacio: {
    fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.escala.cuerpo,
    color: colores.tinta,
    lineHeight: 24,
  },
  dato: {
    marginBottom: espaciado.m,
  },
  datoEtiqueta: {
    fontFamily: tipografia.familias.cuerpoFuerte,
    fontSize: tipografia.escala.nota,
    color: colores.tintaSuave,
    marginBottom: espaciado.xs,
  },
  datoValor: {
    fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.escala.cuerpo,
    color: colores.tinta,
  },
  bloque: {
    borderTopWidth: 1,
    borderTopColor: colores.linea,
    paddingTop: espaciado.m,
    marginTop: espaciado.s,
    marginBottom: espaciado.m,
  },
  bloqueTitulo: {
    fontFamily: tipografia.familias.titulo,
    fontSize: tipografia.escala.cuerpo,
    color: colores.tinta,
    marginBottom: espaciado.m,
  },
  fila: {
    flexDirection: 'row',
    gap: espaciado.m,
    marginBottom: espaciado.m,
  },
  filaOrden: {
    fontFamily: tipografia.familias.titulo,
    fontSize: tipografia.escala.cuerpo,
    color: colores.accion,
    minWidth: 20,
  },
  filaCuerpo: {
    flex: 1,
  },
  filaEncabezado: {
    fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.escala.nota,
    color: colores.tinta,
  },
  filaMetricas: {
    fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.escala.nota,
    color: colores.tintaSuave,
    marginTop: espaciado.xs,
  },
  textoLargo: {
    fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.escala.nota,
    color: colores.tinta,
    lineHeight: 22,
  },
  selloIA: {
    fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.escala.nota,
    color: colores.tintaSuave,
    marginTop: espaciado.s,
    fontStyle: 'italic',
  },
  observacion: {
    borderLeftWidth: 3,
    borderLeftColor: colores.destacado,
    paddingLeft: espaciado.m,
    marginTop: espaciado.m,
  },
  evidencia: {
    fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.escala.nota,
    color: colores.tintaSuave,
    fontStyle: 'italic',
    marginTop: espaciado.xs,
    lineHeight: 20,
  },
  nota: {
    fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.escala.nota,
    color: colores.tintaSuave,
    lineHeight: 20,
    marginTop: espaciado.xs,
  },
});
