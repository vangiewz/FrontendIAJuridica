import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { router } from 'expo-router';
import { FuenteIA, RespuestaJuridicaIA } from '../../models/consultas';
import { TextoRespuesta } from './TextoRespuesta';
import { colores, espaciado, interlineado, radios, tipografia } from '../../theme';

interface Props {
  respuesta: RespuestaJuridicaIA;
  /** Ver `ListaFuentes`: la llamada abre el artículo en su panel en vez de navegar. */
  alAbrirArticulo?: (codigo: string, numero: number) => void;
}

/**
 * Muestra la respuesta en el orden en que se construyo: que se entendio, en que
 * normas se apoya, y que queda fuera. Cada fundamento nombra el articulo real del
 * que salio la cita, para que se pueda ir a leerlo completo.
 */
export function RespuestaIA({ respuesta, alAbrirArticulo }: Props) {
  const porId = new Map<string, FuenteIA>(respuesta.fuentes.map((f) => [f.id, f]));
  const fundamentada = respuesta.estado === 'fundamentada';

  return (
    <View style={styles.contenedor}>
      <Seccion titulo="Tu caso, como lo entendimos">
        <Text style={styles.parrafo}>{respuesta.resumen_caso}</Text>
      </Seccion>

      {respuesta.contexto.hechos.length > 0 && (
        <Seccion titulo="Hechos que tomamos de tu relato">
          {respuesta.contexto.hechos.map((hecho, i) => (
            <Text key={i} style={styles.item}>— {hecho}</Text>
          ))}
          {respuesta.contexto.actores.length > 0 && (
            <Text style={styles.nota}>
              Partes identificadas: {respuesta.contexto.actores.map((a) => a.rol).join(', ')}
            </Text>
          )}
        </Seccion>
      )}

      {fundamentada && respuesta.analisis.length > 0 && (
        <Seccion titulo="En qué artículos se apoya">
          {respuesta.analisis.map((fundamento, i) => {
            const fuente = fundamento.norma_id ? porId.get(fundamento.norma_id) : undefined;
            return (
              <Pressable
                key={i}
                style={styles.fundamento}
                onPress={() => {
                  if (fuente && alAbrirArticulo) {
                    alAbrirArticulo(fuente.codigo, fuente.numero_articulo);
                  } else if (fuente) {
                    router.push(
                      `/(app)/articulo?codigo=${encodeURIComponent(fuente.codigo)}&numero=${fuente.numero_articulo}`,
                    );
                  }
                }}
              >
                {fundamento.problema ? <Text style={styles.articulo}>{fundamento.problema}</Text> : null}
                {fuente ? <Text style={styles.articulo}>{fuente.codigo} — Artículo {fuente.numero_articulo}</Text> : null}
                {fundamento.cita_textual ? <Text style={styles.cita}>“{fundamento.cita_textual}”</Text> : null}
                {fundamento.explicacion ? <Text style={styles.parrafo}>{fundamento.explicacion}</Text> : null}
              </Pressable>
            );
          })}
        </Seccion>
      )}

      {respuesta.fuentes_documento.length > 0 && (
        <Seccion
          titulo={`En qué parte del documento${
            respuesta.documento_nombre ? ` (${respuesta.documento_nombre})` : ''
          }`}
        >
          {respuesta.fuentes_documento.map((fragmento, i) => (
            <View key={i} style={styles.fragmento}>
              <Text style={styles.fragmentoUbicacion}>{fragmento.etiqueta}</Text>
              <Text style={styles.cita}>«{fragmento.texto}»</Text>
            </View>
          ))}
        </Seccion>
      )}

      <Seccion titulo={fundamentada ? 'Orientación' : 'Resultado'}>
        <TextoRespuesta texto={respuesta.conclusion} />
      </Seccion>

      {respuesta.limitaciones.length > 0 && (
        <Seccion titulo="Lo que esta respuesta no cubre">
          {respuesta.limitaciones.map((limite, i) => (
            <Text key={i} style={styles.item}>— {limite}</Text>
          ))}
        </Seccion>
      )}
    </View>
  );
}

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <View style={styles.seccion}>
      <Text style={styles.tituloSeccion}>{titulo}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    marginTop: espaciado.xl,
  },
  seccion: {
    marginBottom: espaciado.xl,
  },
  tituloSeccion: {
    fontFamily: tipografia.familias.cuerpoFuerte,
    fontSize: tipografia.escala.nota,
    color: colores.tintaSuave,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: espaciado.s,
  },
  parrafo: {
    fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.escala.cuerpo,
    color: colores.tinta,
    lineHeight: interlineado.cuerpo,
  },
  item: {
    fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.escala.cuerpo,
    color: colores.tinta,
    lineHeight: interlineado.cuerpo,
    marginBottom: espaciado.xs,
  },
  nota: {
    fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.escala.nota,
    color: colores.tintaSuave,
    marginTop: espaciado.s,
  },
  fundamento: {
    backgroundColor: colores.superficie,
    borderWidth: 1,
    borderColor: colores.linea,
    borderLeftWidth: 3,
    borderLeftColor: colores.accion,
    borderRadius: radios.m,
    padding: espaciado.m,
    marginBottom: espaciado.m,
  },
  articulo: {
    fontFamily: tipografia.familias.cuerpoFuerte,
    fontSize: tipografia.escala.nota,
    color: colores.accion,
    marginBottom: espaciado.s,
  },
  fragmento: { marginBottom: espaciado.s },
  fragmentoUbicacion: {
    fontFamily: tipografia.familias.cuerpoFuerte,
    fontSize: tipografia.escala.nota,
    color: colores.tintaSuave,
    marginBottom: 2,
  },
  cita: {
    fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.escala.cuerpo,
    color: colores.tinta,
    lineHeight: interlineado.cuerpo,
    fontStyle: 'italic',
    marginBottom: espaciado.s,
  },
});
