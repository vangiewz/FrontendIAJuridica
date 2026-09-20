import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Icono, NombreIcono } from '../../shared/Icono';
import { EntidadCatalogo } from '../../../models/reportes';
import { colores, espaciado, radios, tipografia } from '../../../theme';

interface Props {
  entidades: EntidadCatalogo[];
  elegida: string;
  onElegir: (entidad: string) => void;
}

// Un icono por tipo de informacion, para reconocerlo de un vistazo. Si el backend suma
// una entidad nueva cae en el icono de respaldo y la tarjeta sigue funcionando.
const ICONOS: Record<string, NombreIcono> = {
  documentos: 'document-text-outline',
  riesgos: 'warning-outline',
  consultas: 'chatbubble-ellipses-outline',
  analisis: 'analytics-outline',
  comparaciones: 'git-compare-outline',
  normativa: 'library-outline',
};

const RESPALDO: NombreIcono = 'folder-outline';

/** Frases cortas; la descripcion del backend es precisa pero larga para una tarjeta. */
const RESUMENES: Record<string, string> = {
  documentos: 'Contratos y archivos que subiste',
  riesgos: 'Riesgos detectados en tus contratos',
  consultas: 'Las consultas jurídicas que hiciste',
  analisis: 'Los análisis hechos sobre tus documentos',
  comparaciones: 'Comparaciones entre dos documentos',
  normativa: 'Artículos y normas del Código Civil',
};

/**
 * Paso 1: sobre que se hace el reporte.
 *
 * Tarjetas grandes en vez de chips: es la primera decision y la que condiciona todo lo
 * demas, asi que tiene que ser lo mas visible de la pantalla.
 */
export function SelectorEntidad({ entidades, elegida, onElegir }: Props) {
  return (
    <View style={styles.grilla}>
      {entidades.map((entidad) => {
        const activa = entidad.entidad === elegida;
        return (
          <Pressable
            key={entidad.entidad}
            onPress={() => onElegir(entidad.entidad)}
            style={[styles.tarjeta, activa && styles.tarjetaActiva]}
            accessibilityRole="button"
            accessibilityState={{ selected: activa }}
            accessibilityLabel={entidad.etiqueta}
          >
            <View style={styles.fila}>
              <Icono
                nombre={ICONOS[entidad.entidad] ?? RESPALDO}
                tamano={28}
                color={activa ? colores.accion : colores.tintaSuave}
              />
              {/* El tilde acompaña al color: la seleccion no depende solo del verde. */}
              {activa ? (
                <Icono nombre="checkmark-circle" tamano={22} color={colores.accion} />
              ) : null}
            </View>
            <Text style={[styles.nombre, activa && styles.nombreActivo]}>
              {entidad.etiqueta}
            </Text>
            <Text style={styles.detalle}>
              {RESUMENES[entidad.entidad] ?? entidad.descripcion}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grilla: { flexDirection: 'row', flexWrap: 'wrap', gap: espaciado.m },
  tarjeta: {
    width: 220,
    flexGrow: 1,
    maxWidth: 300,
    minHeight: 120,
    borderWidth: 2,
    borderColor: colores.linea,
    borderRadius: radios.l,
    backgroundColor: colores.superficie,
    padding: espaciado.m,
  },
  tarjetaActiva: { borderColor: colores.accion, backgroundColor: colores.papel },
  fila: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  nombre: {
    fontFamily: tipografia.familias.cuerpoFuerte,
    fontSize: tipografia.escala.cuerpo,
    color: colores.tinta,
    marginTop: espaciado.s,
  },
  nombreActivo: { color: colores.accion },
  detalle: {
    fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.escala.nota,
    color: colores.tintaSuave,
    lineHeight: 19,
    marginTop: 2,
  },
});
