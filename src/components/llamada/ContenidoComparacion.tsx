import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { FichaDiferencia } from '../documentos/FichaDiferencia';
import { Pestanas } from './Pestanas';
import { Comparacion } from '../../models/documentos';
import { colores, espaciado, radios, tipografia } from '../../theme';

type Vista = 'resumen' | 'diferencias';

/**
 * La comparación que devolvió el backend: cuántos cambios hay, de qué tipo y cada
 * diferencia con su ubicación, su antes y su después. No se agrega nada que la respuesta
 * no traiga (montos, fechas o riesgos aparecen solo si están dentro de las diferencias).
 */
export function ContenidoComparacion({ comparacion }: { comparacion: Comparacion }) {
  const [vista, setVista] = useState<Vista>('resumen');
  const cuenta = (tipo: string) => comparacion.diferencias.filter((d) => d.tipo === tipo).length;

  return (
    <View style={styles.raiz}>
      <Pestanas activa={vista} onCambiar={setVista}
        pestanas={[{ clave: 'resumen', etiqueta: 'Resumen' },
                   { clave: 'diferencias', etiqueta: `Diferencias (${comparacion.cantidad_cambios})` }]} />
      <ScrollView contentContainerStyle={styles.scroll}>
        {vista === 'resumen' ? (
          <View style={styles.bloque}>
            <Dato etiqueta="Documento A" valor={comparacion.nombre_a} />
            <Dato etiqueta="Documento B" valor={comparacion.nombre_b} />
            {comparacion.cantidad_cambios === 0 ? (
              <Text style={styles.texto}>No se detectaron diferencias entre los documentos.</Text>
            ) : (
              <>
                <Dato etiqueta="Cambios detectados" valor={String(comparacion.cantidad_cambios)} />
                <Dato etiqueta="Por tipo"
                  valor={`${cuenta('modificado')} modificados · ${cuenta('agregado')} agregados · ${cuenta('eliminado')} eliminados`} />
                <Text style={styles.nota}>
                  {comparacion.estrategia === 'clausulas'
                    ? 'Comparación realizada cláusula por cláusula.'
                    : 'No se reconocieron cláusulas en ambos documentos: la comparación se hizo por párrafos.'}
                </Text>
              </>
            )}
          </View>
        ) : comparacion.diferencias.length === 0 ? (
          <Text style={styles.texto}>No se detectaron diferencias.</Text>
        ) : (
          comparacion.diferencias.map((d, i) => (
            <FichaDiferencia key={`${d.tipo}-${d.ubicacion}-${i}`} diferencia={d} />
          ))
        )}
      </ScrollView>
    </View>
  );
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <View style={styles.dato}>
      <Text style={styles.etiqueta}>{etiqueta}</Text>
      <Text style={styles.texto}>{valor}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  raiz: { flex: 1 },
  scroll: { paddingHorizontal: espaciado.m, paddingBottom: espaciado.xl },
  bloque: {
    backgroundColor: colores.papel, borderWidth: 1, borderColor: colores.linea, borderRadius: radios.m,
    padding: espaciado.m, gap: espaciado.s,
  },
  dato: { gap: 2 },
  etiqueta: { fontFamily: tipografia.familias.cuerpoFuerte, fontSize: tipografia.escala.nota, color: colores.tintaSuave },
  texto: { fontFamily: tipografia.familias.cuerpo, fontSize: tipografia.escala.cuerpo, color: colores.tinta, lineHeight: 24 },
  nota: { fontFamily: tipografia.familias.cuerpo, fontSize: tipografia.escala.nota, color: colores.tintaSuave },
});
