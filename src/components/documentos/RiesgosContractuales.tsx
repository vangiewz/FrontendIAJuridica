import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colores, espaciado, radios, tipografia } from '../../theme';
import {
  Analisis,
  Riesgo,
  SeveridadRiesgo,
  etiquetaSeveridad,
  resumirSeveridades,
  tieneReglasPropias,
} from '../../models/documentos';

interface Props {
  analisis: Analisis;
}

const COLOR_SEVERIDAD: Record<SeveridadRiesgo, string> = {
  alta: colores.alerta,
  media: colores.destacado,
  baja: colores.tintaSuave,
};

function colorDe(severidad: SeveridadRiesgo): string {
  return COLOR_SEVERIDAD[severidad] ?? colores.tintaSuave;
}

/**
 * Un riesgo tal como lo devuelve el motor de reglas. El titulo y la explicacion
 * son textos del backend: no se reescriben ni se completan. Los campos que llegan
 * en null (evidencia, clausula) simplemente no se muestran.
 */
function FichaRiesgo({ riesgo }: { riesgo: Riesgo }) {
  const color = colorDe(riesgo.severidad);

  return (
    <View style={[styles.ficha, { borderLeftColor: color }]}>
      <View style={styles.cabecera}>
        <Text style={[styles.severidad, { color }]}>{etiquetaSeveridad(riesgo.severidad)}</Text>
        <Text style={styles.codigo}>{riesgo.codigo_regla}</Text>
      </View>

      <Text style={styles.titulo}>{riesgo.titulo}</Text>
      <Text style={styles.explicacion}>{riesgo.explicacion}</Text>

      {riesgo.evidencia ? (
        <View style={styles.detalle}>
          <Text style={styles.detalleEtiqueta}>Evidencia en el documento</Text>
          <Text style={styles.evidencia} numberOfLines={3}>
            “{riesgo.evidencia}”
          </Text>
        </View>
      ) : null}

      {riesgo.clausula !== null ? (
        <View style={styles.detalle}>
          <Text style={styles.detalleEtiqueta}>Cláusula relacionada</Text>
          <Text style={styles.detalleValor}>Cláusula {riesgo.clausula}</Text>
        </View>
      ) : null}

      {riesgo.articulos.length > 0 ? (
        <View style={styles.detalle}>
          <Text style={styles.detalleEtiqueta}>
            {riesgo.articulos.length === 1 ? 'Fundamento jurídico' : 'Fundamentos jurídicos'}
          </Text>
          <Text style={styles.detalleValor}>
            {/* Solo el numero: el backend no manda el texto del articulo. */}
            {riesgo.articulos.map((a) => `Art. ${a}`).join(' · ')} — Código Civil
          </Text>
        </View>
      ) : null}
    </View>
  );
}

export function RiesgosContractuales({ analisis }: Props) {
  const { riesgos } = analisis;
  // El motor corre igual sin un tipo contractual propio, pero solo con las reglas
  // comunes. reglas_evaluadas lo confirma: 3 comunes contra 6 cuando hay set propio.
  const soloReglasGenerales = !tieneReglasPropias(analisis.tipo_documento);

  return (
    <View style={styles.card}>
      <Text style={styles.tituloSeccion}>RIESGOS CONTRACTUALES</Text>

      {soloReglasGenerales ? (
        <Text style={styles.nota}>
          {analisis.tipo_documento === 'otro'
            ? 'El documento no fue identificado como un contrato civil específico; se aplicaron únicamente las reglas generales disponibles.'
            : 'Para este tipo de documento el sistema aplica únicamente las reglas generales: todavía no tiene un conjunto de reglas propio.'}
        </Text>
      ) : null}

      {riesgos.length === 0 ? (
        <Text style={styles.vacio}>
          No se detectaron riesgos contractuales con las reglas actuales.
        </Text>
      ) : (
        <>
          <Text style={styles.conteo}>
            {riesgos.length} {riesgos.length === 1 ? 'riesgo detectado' : 'riesgos detectados'}
            {' · '}
            {resumirSeveridades(riesgos)
              .map((s) => `${s.total} ${etiquetaSeveridad(s.severidad).toLowerCase()}`)
              .join(', ')}
          </Text>

          {riesgos.map((riesgo) => (
            <FichaRiesgo key={`${riesgo.codigo_regla}-${riesgo.inicio ?? 'sin-posicion'}`} riesgo={riesgo} />
          ))}
        </>
      )}

      <Text style={styles.limite}>
        El motor trabaja con un conjunto limitado de reglas sobre el Código Civil y no sustituye
        la revisión de un abogado.
      </Text>
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
  tituloSeccion: {
    fontFamily: tipografia.familias.cuerpoFuerte,
    fontSize: tipografia.escala.nota,
    color: colores.tintaSuave,
    letterSpacing: 1,
    marginBottom: espaciado.m,
  },
  nota: {
    fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.escala.nota,
    color: colores.tintaSuave,
    lineHeight: 20,
    marginBottom: espaciado.m,
  },
  vacio: {
    fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.escala.cuerpo,
    color: colores.tinta,
    lineHeight: 24,
  },
  conteo: {
    fontFamily: tipografia.familias.cuerpoFuerte,
    fontSize: tipografia.escala.nota,
    color: colores.tinta,
    marginBottom: espaciado.m,
  },
  ficha: {
    borderLeftWidth: 4,
    borderTopWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderTopColor: colores.linea,
    borderRightColor: colores.linea,
    borderBottomColor: colores.linea,
    borderRadius: radios.s,
    padding: espaciado.m,
    marginBottom: espaciado.m,
  },
  cabecera: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: espaciado.s,
    marginBottom: espaciado.s,
  },
  severidad: {
    fontFamily: tipografia.familias.cuerpoFuerte,
    fontSize: tipografia.escala.nota,
    letterSpacing: 1,
  },
  codigo: {
    fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.escala.nota,
    color: colores.tintaSuave,
  },
  titulo: {
    fontFamily: tipografia.familias.titulo,
    fontSize: tipografia.escala.cuerpo,
    color: colores.tinta,
    marginBottom: espaciado.s,
  },
  explicacion: {
    fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.escala.nota,
    color: colores.tinta,
    lineHeight: 22,
  },
  detalle: {
    marginTop: espaciado.m,
  },
  detalleEtiqueta: {
    fontFamily: tipografia.familias.cuerpoFuerte,
    fontSize: tipografia.escala.nota,
    color: colores.tintaSuave,
    marginBottom: espaciado.xs,
  },
  detalleValor: {
    fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.escala.nota,
    color: colores.tinta,
  },
  evidencia: {
    fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.escala.nota,
    color: colores.tinta,
    lineHeight: 22,
    borderLeftWidth: 2,
    borderLeftColor: colores.linea,
    paddingLeft: espaciado.m,
  },
  limite: {
    fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.escala.nota,
    color: colores.tintaSuave,
    lineHeight: 20,
    borderTopWidth: 1,
    borderTopColor: colores.linea,
    paddingTop: espaciado.m,
    marginTop: espaciado.s,
  },
});
