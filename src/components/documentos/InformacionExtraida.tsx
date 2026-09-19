import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colores, espaciado, radios, tipografia } from '../../theme';
import {
  Analisis,
  Clausula,
  Hallazgo,
  agruparHallazgos,
  tieneInformacionExtraida,
} from '../../models/documentos';

interface Props {
  analisis: Analisis;
}

/** Un dato reconocido. `clausula` es la trazabilidad: donde aparecio en el documento. */
function ItemHallazgo({ hallazgo }: { hallazgo: Hallazgo }) {
  return (
    <View style={styles.item}>
      <Text style={styles.itemTexto}>{hallazgo.texto}</Text>
      {hallazgo.clausula !== null ? (
        <Text style={styles.itemOrigen}>Cláusula {hallazgo.clausula}</Text>
      ) : null}
    </View>
  );
}

/**
 * Una clausula segmentada. Se muestra un fragmento y no el cuerpo completo:
 * el encabezado que devuelve el backend es la primera linea entera de la clausula,
 * y el texto puede ser de varios parrafos.
 */
function ItemClausula({ clausula }: { clausula: Clausula }) {
  return (
    <View style={styles.item}>
      <Text style={styles.clausulaOrden}>Cláusula {clausula.orden}</Text>
      <Text style={styles.clausulaEncabezado} numberOfLines={2}>
        {clausula.encabezado}
      </Text>
      {clausula.texto.trim() ? (
        <Text style={styles.clausulaTexto} numberOfLines={3}>
          {clausula.texto.trim()}
        </Text>
      ) : null}
    </View>
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

export function InformacionExtraida({ analisis }: Props) {
  const grupos = agruparHallazgos(analisis.hallazgos);
  const partes = analisis.parrafo_partes?.trim();

  if (!tieneInformacionExtraida(analisis)) {
    return (
      <View style={styles.card}>
        <Text style={styles.titulo}>INFORMACIÓN EXTRAÍDA</Text>
        <Text style={styles.vacio}>
          No se detectó información jurídica estructurada en este documento.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <Text style={styles.titulo}>INFORMACIÓN EXTRAÍDA</Text>

      {partes ? (
        <Bloque titulo="Partes">
          {/* El backend devuelve el parrafo donde intervienen las partes, no una lista
              de nombres: se muestra tal cual para que el usuario lo revise. */}
          <Text style={styles.parrafoPartes}>{partes.replace(/\s*\n\s*/g, ' ')}</Text>
        </Bloque>
      ) : null}

      {grupos.map((grupo) => (
        <Bloque key={grupo.titulo} titulo={grupo.titulo}>
          {grupo.items.map((hallazgo) => (
            <ItemHallazgo key={`${hallazgo.tipo}-${hallazgo.inicio}`} hallazgo={hallazgo} />
          ))}
        </Bloque>
      ))}

      {analisis.clausulas.length > 0 ? (
        <Bloque titulo={`Cláusulas (${analisis.clausulas.length})`}>
          {analisis.clausulas.map((clausula) => (
            <ItemClausula key={clausula.orden} clausula={clausula} />
          ))}
        </Bloque>
      ) : null}
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
  bloque: {
    marginBottom: espaciado.l,
  },
  bloqueTitulo: {
    fontFamily: tipografia.familias.titulo,
    fontSize: tipografia.escala.cuerpo,
    color: colores.tinta,
    marginBottom: espaciado.s,
  },
  item: {
    borderLeftWidth: 2,
    borderLeftColor: colores.linea,
    paddingLeft: espaciado.m,
    paddingVertical: espaciado.xs,
    marginBottom: espaciado.s,
  },
  itemTexto: {
    fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.escala.cuerpo,
    color: colores.tinta,
  },
  itemOrigen: {
    fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.escala.nota,
    color: colores.tintaSuave,
    marginTop: espaciado.xs,
  },
  parrafoPartes: {
    fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.escala.nota,
    color: colores.tinta,
    lineHeight: 22,
    borderLeftWidth: 2,
    borderLeftColor: colores.linea,
    paddingLeft: espaciado.m,
  },
  clausulaOrden: {
    fontFamily: tipografia.familias.cuerpoFuerte,
    fontSize: tipografia.escala.nota,
    color: colores.accion,
    marginBottom: espaciado.xs,
  },
  clausulaEncabezado: {
    fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.escala.nota,
    color: colores.tinta,
  },
  clausulaTexto: {
    fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.escala.nota,
    color: colores.tintaSuave,
    lineHeight: 20,
    marginTop: espaciado.xs,
  },
});
