import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useArticulo } from '../../controllers/normativa/useArticulo';
import { EsqueletoLectura } from '../normativa/EsqueletoLectura';
import { MigaJuridica } from '../normativa/MigaJuridica';
import { ProcedenciaFuente } from '../normativa/ProcedenciaFuente';
import { ExplicacionSimple } from '../normativa/ExplicacionSimple';
import { SelloVigencia } from '../consultas/SelloVigencia';
import { Boton } from '../shared/Boton';
import { colores, espaciado, interlineado, tipografia } from '../../theme';

interface Props {
  codigo: string;
  numero: number;
  /** Anterior o siguiente: cambia el artículo del mismo nivel del panel, no apila otro. */
  alCambiar: (numero: number) => void;
}

/**
 * El detalle de un artículo dentro del panel: el mismo contenido que la pantalla de
 * artículo (`useArticulo`, migas, procedencia, explicación en palabras simples), pero sin
 * navegar. «Atrás» del panel vuelve a la respuesta o a las fuentes de donde se abrió.
 */
export function ContenidoArticulo({ codigo, numero, alCambiar }: Props) {
  const { articulo, cargando, error } = useArticulo(codigo, numero);

  if (cargando) return <View style={styles.espera}><EsqueletoLectura /></View>;
  if (error || !articulo) return <Text style={styles.error}>{error ?? 'No se encontró el artículo.'}</Text>;

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <MigaJuridica ubicacion={articulo.ubicacion} />
      <Text style={styles.codigo}>{articulo.codigo}</Text>
      <Text style={styles.numero}>Artículo {articulo.numero_articulo}</Text>
      {articulo.epigrafe ? (
        <View style={styles.epigrafeFila}>
          <Text style={styles.epigrafe}>{articulo.epigrafe}</Text>
          <SelloVigencia estado={articulo.estado_vigencia} />
        </View>
      ) : null}
      <Text style={styles.texto} selectable>{articulo.texto}</Text>

      <ExplicacionSimple codigo={articulo.codigo} numero={articulo.numero_articulo} />
      <ProcedenciaFuente fuenteNombre={articulo.fuente_nombre} fuenteUrl={articulo.fuente_url}
        estado={articulo.estado_vigencia} nota={articulo.nota_vigencia} />

      {articulo.anterior !== null || articulo.siguiente !== null ? (
        <View style={styles.navegacion}>
          <View style={styles.mitad}>
            {articulo.anterior !== null ? (
              <Boton variante="secundario" titulo={`‹ Artículo ${articulo.anterior}`}
                onPress={() => alCambiar(articulo.anterior as number)} />
            ) : null}
          </View>
          <View style={styles.mitad}>
            {articulo.siguiente !== null ? (
              <Boton variante="secundario" titulo={`Artículo ${articulo.siguiente} ›`}
                onPress={() => alCambiar(articulo.siguiente as number)} />
            ) : null}
          </View>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: espaciado.m, paddingBottom: espaciado.xl },
  espera: { padding: espaciado.m },
  error: {
    fontFamily: tipografia.familias.cuerpo, fontSize: tipografia.escala.cuerpo, color: colores.tinta,
    padding: espaciado.m,
  },
  codigo: { fontFamily: tipografia.familias.cuerpo, fontSize: tipografia.escala.nota, color: colores.tintaSuave },
  numero: {
    fontFamily: tipografia.familias.titulo, fontSize: tipografia.escala.titulo, color: colores.destacado,
    marginBottom: espaciado.s,
  },
  epigrafeFila: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', gap: espaciado.s, marginBottom: espaciado.m },
  epigrafe: {
    fontFamily: tipografia.familias.titulo, fontSize: tipografia.escala.subtitulo, color: colores.tinta, flexShrink: 1,
  },
  texto: {
    fontFamily: tipografia.familias.cuerpo, fontSize: tipografia.escala.cuerpo, lineHeight: interlineado.cuerpo,
    color: colores.tinta,
  },
  navegacion: { flexDirection: 'row', gap: espaciado.m, marginTop: espaciado.xl },
  mitad: { flex: 1 },
});
