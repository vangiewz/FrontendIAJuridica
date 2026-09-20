import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { RespuestaJuridicaIA } from '../../models/consultas';
import { Icono } from '../shared/Icono';
import { TextoRespuesta } from './TextoRespuesta';
import { colores, espaciado, interlineado, radios, tipografia } from '../../theme';

export function RespuestaChat({ respuesta, documentoId }: {
  respuesta: RespuestaJuridicaIA;
  documentoId: string | null;
}) {
  const router = useRouter();
  const [abiertas, setAbiertas] = useState(false);
  const relato = respuesta.trazabilidad?.modo_consulta === 'relato';
  const complejo = respuesta.trazabilidad?.modo === 'caso_complejo';
  const porId = new Map(respuesta.fuentes.map((fuente) => [fuente.id, fuente]));
  const apartados = Array.from(respuesta.analisis.reduce((mapa, item, indice) => {
    const clave = item.problema || `Análisis ${indice + 1}`;
    const previos = mapa.get(clave) || [];
    mapa.set(clave, [...previos, item]);
    return mapa;
  }, new Map<string, typeof respuesta.analisis>()));
  const fuentes = respuesta.fuentes.filter((f) =>
    respuesta.articulos_utilizados.includes(f.id));
  const normas = fuentes.length ? fuentes : respuesta.fuentes;
  const cantidad = normas.length + respuesta.fuentes_documento.length;
  const limites = respuesta.fuentes.length > 0
    ? respuesta.limitaciones.filter((item) => !item.startsWith('Respuesta generada como herramienta'))
    : [];

  return (
    <View style={styles.contenedor}>
      {complejo && respuesta.resumen_caso ? (
        <View style={styles.hechos}>
          <Text style={styles.subtitulo}>Tu caso en breve</Text>
          <Text style={styles.respuesta}>{respuesta.resumen_caso}</Text>
        </View>
      ) : relato && respuesta.contexto.hechos.length > 0 ? (
        <View style={styles.hechos}>
          <Text style={styles.subtitulo}>Tu caso, como lo entendimos</Text>
          {respuesta.contexto.hechos.map((hecho, i) => (
            <Text key={i} style={styles.nota}>{hecho}</Text>
          ))}
        </View>
      ) : null}
      {complejo && apartados.length > 0 ? (
        <View style={styles.analisis}>
          <Text style={styles.subtitulo}>Análisis jurídico</Text>
          {apartados.map(([titulo, items], indice) => (
            <View key={titulo} style={styles.apartado}>
              <Text style={styles.apartadoTitulo}>{indice + 1}. {titulo}</Text>
              {items.find((item) => item.explicacion)?.explicacion ? (
                <Text style={styles.respuesta}>{items.find((item) => item.explicacion)?.explicacion}</Text>
              ) : null}
              <View style={styles.referencias}>
                {items.filter((item) => item.norma_id && porId.has(item.norma_id))
                  .map((item, i) => {
                    const fuente = porId.get(item.norma_id!);
                    return fuente ? (
                      <Pressable key={`${fuente.id}-${i}`}
                        onPress={() => router.push(`/(app)/articulo?codigo=${encodeURIComponent(fuente.codigo)}&numero=${fuente.numero_articulo}`)}
                        accessibilityRole="button">
                        <Text style={styles.referencia}>{fuente.codigo} · Art. {fuente.numero_articulo}{fuente.epigrafe ? ` · ${fuente.epigrafe}` : ''}</Text>
                      </Pressable>
                    ) : null;
                  })}
              </View>
            </View>
          ))}
        </View>
      ) : relato && respuesta.analisis.some((item) => item.explicacion) ? (
        <View style={styles.analisis}>
          {respuesta.analisis.filter((item) => item.explicacion).map((item, i) => (
            <Text key={i} style={styles.nota}>{item.explicacion}</Text>
          ))}
        </View>
      ) : null}
      {complejo ? <Text style={[styles.subtitulo, styles.separador]}>Conclusión orientativa</Text> : null}
      <TextoRespuesta texto={respuesta.conclusion} />
      {limites.length > 0 ? (
        <View style={styles.separador}>
          <Text style={styles.subtitulo}>Información adicional necesaria</Text>
          {limites.map((limite, i) => <Text key={i} style={styles.limite}>{limite}</Text>)}
        </View>
      ) : null}
      {cantidad > 0 ? (
        <View style={styles.fuentes}>
          <Pressable
            onPress={() => setAbiertas((valor) => !valor)}
            accessibilityRole="button"
            accessibilityLabel={`${abiertas ? 'Ocultar' : 'Mostrar'} fuentes`}
            style={styles.fuentesControl}
          >
            <Icono nombre="documents-outline" tamano={16} color={colores.accion} />
            <Text style={styles.fuentesTitulo}>Fuentes ({cantidad})</Text>
            <Icono nombre={abiertas ? 'chevron-up' : 'chevron-down'} tamano={16} color={colores.accion} />
          </Pressable>
          {abiertas ? (
            <View style={styles.lista}>
              {normas.map((fuente) => (
                <Pressable key={fuente.id} style={styles.fuente}
                  onPress={() => router.push(`/(app)/articulo?codigo=${encodeURIComponent(fuente.codigo)}&numero=${fuente.numero_articulo}`)}
                  accessibilityRole="button">
                  <Text style={styles.fuenteTitulo}>{fuente.codigo} · Art. {fuente.numero_articulo}</Text>
                  {fuente.epigrafe ? <Text style={styles.nota}>{fuente.epigrafe}</Text> : null}
                  {respuesta.analisis.find((item) => item.norma_id === fuente.id)?.cita_textual ? (
                    <Text style={styles.extracto} numberOfLines={3}>
                      {respuesta.analisis.find((item) => item.norma_id === fuente.id)?.cita_textual}
                    </Text>
                  ) : null}
                </Pressable>
              ))}
              {respuesta.fuentes_documento.map((fuente, i) => (
                <Pressable key={`${fuente.etiqueta}-${i}`} style={styles.fuente}
                  onPress={() => { if (documentoId) router.push(`/(app)/documento?id=${documentoId}`); }}
                  accessibilityRole={documentoId ? 'button' : undefined}>
                  <Text style={styles.fuenteTitulo}>
                    {respuesta.documento_nombre ?? 'Documento'} · {fuente.etiqueta}
                  </Text>
                  <Text style={styles.extracto} numberOfLines={abiertas ? 4 : 1}>{fuente.texto}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { alignSelf: 'flex-start', maxWidth: '94%', backgroundColor: colores.superficie,
    borderWidth: 1, borderColor: colores.linea, borderRadius: radios.l,
    padding: espaciado.m, marginTop: espaciado.m },
  respuesta: { color: colores.tinta, fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.escala.cuerpo, lineHeight: interlineado.cuerpo },
  hechos: { marginBottom: espaciado.m },
  subtitulo: { color: colores.tintaSuave, fontFamily: tipografia.familias.cuerpoFuerte,
    fontSize: tipografia.escala.nota, marginBottom: espaciado.xs },
  nota: { color: colores.tintaSuave, fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.escala.nota, lineHeight: 19 },
  analisis: { marginTop: espaciado.m, gap: espaciado.s },
  apartado: { paddingVertical: espaciado.s, borderTopWidth: 1, borderTopColor: colores.linea, gap: espaciado.xs },
  apartadoTitulo: { color: colores.tinta, fontFamily: tipografia.familias.cuerpoFuerte,
    fontSize: tipografia.escala.cuerpo },
  referencias: { gap: 3, marginTop: espaciado.xs },
  referencia: { color: colores.accion, fontFamily: tipografia.familias.cuerpoFuerte,
    fontSize: tipografia.escala.nota, lineHeight: 18 },
  separador: { marginTop: espaciado.m },
  limite: { color: colores.tintaSuave, fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.escala.nota, lineHeight: 19, marginTop: espaciado.s },
  fuentes: { marginTop: espaciado.m, borderTopWidth: 1, borderTopColor: colores.linea,
    paddingTop: espaciado.s },
  fuentesControl: { flexDirection: 'row', alignItems: 'center', gap: espaciado.xs,
    minHeight: 36 },
  fuentesTitulo: { color: colores.accion, fontFamily: tipografia.familias.cuerpoFuerte,
    fontSize: tipografia.escala.nota, flex: 1 },
  lista: { gap: espaciado.s, marginTop: espaciado.xs },
  fuente: { padding: espaciado.s, borderRadius: radios.m, backgroundColor: colores.papel },
  fuenteTitulo: { color: colores.accion, fontFamily: tipografia.familias.cuerpoFuerte,
    fontSize: tipografia.escala.nota },
  extracto: { color: colores.tintaSuave, fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.escala.nota, marginTop: 3, lineHeight: 18 },
});
