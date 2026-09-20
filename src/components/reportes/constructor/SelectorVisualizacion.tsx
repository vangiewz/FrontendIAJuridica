import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Icono, NombreIcono } from '../../shared/Icono';
import { Visualizacion } from '../../../models/reportes';
import { colores, espaciado, radios, tipografia } from '../../../theme';

interface Props {
  opciones: { clave: Visualizacion; etiqueta: string }[];
  elegida: Visualizacion;
  onElegir: (clave: Visualizacion) => void;
}

/** Como se llama cada vista en la pantalla y para que sirve, en una linea. */
const PRESENTACION: Record<string, { icono: NombreIcono; nombre: string; detalle: string }> = {
  tabla: { icono: 'grid-outline', nombre: 'Tabla', detalle: 'Una fila por resultado' },
  barras: { icono: 'bar-chart-outline', nombre: 'Barras', detalle: 'Comparar cantidades' },
  torta: { icono: 'pie-chart-outline', nombre: 'Circular', detalle: 'Ver proporciones' },
  resumen: { icono: 'reader-outline', nombre: 'Resumen', detalle: 'Solo las cifras' },
};

/** Paso 4: como se quiere ver el resultado. Solo cambia la forma, no los datos. */
export function SelectorVisualizacion({ opciones, elegida, onElegir }: Props) {
  return (
    <View style={styles.grilla}>
      {opciones.map(({ clave, etiqueta }) => {
        const activa = clave === elegida;
        const presentacion = PRESENTACION[clave] ?? {
          icono: 'grid-outline' as NombreIcono, nombre: etiqueta, detalle: '',
        };
        return (
          <Pressable
            key={clave}
            onPress={() => onElegir(clave)}
            style={[styles.tarjeta, activa && styles.activa]}
            accessibilityRole="button"
            accessibilityState={{ selected: activa }}
            accessibilityLabel={presentacion.nombre + '. ' + presentacion.detalle}
          >
            <Icono
              nombre={presentacion.icono}
              tamano={28}
              color={activa ? colores.accion : colores.tintaSuave}
            />
            <Text style={[styles.nombre, activa && styles.nombreActivo]}>
              {presentacion.nombre}
            </Text>
            <Text style={styles.detalle}>{presentacion.detalle}</Text>
            {activa ? (
              <Icono nombre="checkmark" tamano={16} color={colores.accion} />
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grilla: { flexDirection: 'row', flexWrap: 'wrap', gap: espaciado.m },
  tarjeta: {
    width: 160,
    flexGrow: 1,
    maxWidth: 240,
    minHeight: 118,
    borderWidth: 2,
    borderColor: colores.linea,
    borderRadius: radios.l,
    backgroundColor: colores.superficie,
    padding: espaciado.m,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activa: { borderColor: colores.accion, backgroundColor: colores.papel },
  nombre: {
    fontFamily: tipografia.familias.cuerpoFuerte,
    fontSize: tipografia.escala.cuerpo,
    color: colores.tinta,
    marginTop: espaciado.xs,
  },
  nombreActivo: { color: colores.accion },
  detalle: {
    fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.escala.nota,
    color: colores.tintaSuave,
    textAlign: 'center',
    marginTop: 2,
  },
});
