import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Icono, NombreIcono } from '../../shared/Icono';
import { EspecificacionReporte, especificacionVacia } from '../../../models/reportes';
import { colores, espaciado, radios, tipografia } from '../../../theme';

interface Props {
  onElegir: (especificacion: EspecificacionReporte) => void;
}

/**
 * Tres ejemplos para arrancar. Solo rellenan el constructor: despues se puede cambiar
 * todo, agregar columnas o cambiar la vista. No son reportes cerrados.
 */
const PLANTILLAS: {
  icono: NombreIcono;
  nombre: string;
  detalle: string;
  especificacion: EspecificacionReporte;
}[] = [
  {
    icono: 'bar-chart-outline',
    nombre: 'Documentos por tipo',
    detalle: 'Cuántos tenés de cada tipo',
    especificacion: {
      ...especificacionVacia('documentos'),
      agrupacion: ['tipo_documento'],
      agregaciones: [{ funcion: 'conteo', campo: '' }],
      visualizacion: 'barras',
    },
  },
  {
    icono: 'warning-outline',
    nombre: 'Riesgos por severidad',
    detalle: 'Alto, medio y bajo',
    especificacion: {
      ...especificacionVacia('riesgos'),
      agrupacion: ['severidad'],
      agregaciones: [{ funcion: 'conteo', campo: '' }],
      visualizacion: 'torta',
    },
  },
  {
    icono: 'chatbubble-ellipses-outline',
    nombre: 'Consultas por área',
    detalle: 'Agrupadas por área jurídica',
    especificacion: {
      ...especificacionVacia('consultas'),
      agrupacion: ['area_juridica'],
      agregaciones: [{ funcion: 'conteo', campo: '' }],
      visualizacion: 'barras',
    },
  },
];

export function PlantillasRapidas({ onElegir }: Props) {
  return (
    <View style={styles.contenedor}>
      <Text style={styles.titulo}>Empezá con un ejemplo</Text>
      <Text style={styles.ayuda}>
        Cargan una configuración lista que después podés modificar.
      </Text>
      <View style={styles.grilla}>
        {PLANTILLAS.map((plantilla) => (
          <Pressable
            key={plantilla.nombre}
            onPress={() => onElegir(plantilla.especificacion)}
            style={styles.tarjeta}
            accessibilityRole="button"
            accessibilityLabel={plantilla.nombre + '. ' + plantilla.detalle}
          >
            <Icono nombre={plantilla.icono} tamano={24} color={colores.accion} />
            <View style={styles.textos}>
              <Text style={styles.nombre}>{plantilla.nombre}</Text>
              <Text style={styles.detalle}>{plantilla.detalle}</Text>
            </View>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { marginBottom: espaciado.xl },
  titulo: {
    fontFamily: tipografia.familias.cuerpoFuerte,
    fontSize: tipografia.escala.cuerpo,
    color: colores.tinta,
  },
  ayuda: {
    fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.escala.nota,
    color: colores.tintaSuave,
    marginTop: 2,
    marginBottom: espaciado.m,
  },
  grilla: { flexDirection: 'row', flexWrap: 'wrap', gap: espaciado.m },
  tarjeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.m,
    width: 260,
    flexGrow: 1,
    maxWidth: 380,
    minHeight: 72,
    borderWidth: 1,
    borderColor: colores.linea,
    borderRadius: radios.l,
    backgroundColor: colores.superficie,
    paddingVertical: espaciado.s,
    paddingHorizontal: espaciado.m,
  },
  textos: { flex: 1 },
  nombre: {
    fontFamily: tipografia.familias.cuerpoFuerte,
    fontSize: tipografia.escala.cuerpo,
    color: colores.tinta,
  },
  detalle: {
    fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.escala.nota,
    color: colores.tintaSuave,
    marginTop: 2,
  },
});
