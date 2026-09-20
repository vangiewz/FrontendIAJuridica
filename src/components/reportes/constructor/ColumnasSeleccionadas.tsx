import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Arrastrable } from '../arrastre/Arrastrable';
import { ZonaSoltar } from '../arrastre/ZonaSoltar';
import { Icono, NombreIcono } from '../../shared/Icono';
import { EntidadCatalogo, etiquetaDe } from '../../../models/reportes';
import { colores, espaciado, radios, tipografia } from '../../../theme';

interface Props {
  definicion: EntidadCatalogo | undefined;
  columnas: string[];
  /** Clave recien agregada: se resalta un instante para que se vea que entro. */
  destacada: string | null;
  onSoltar: (clave: string) => void;
  onSoltarEn: (clave: string, indice: number) => void;
  onQuitar: (clave: string) => void;
  onMover: (desde: number, hasta: number) => void;
}

/**
 * Paso 2, lado derecho: lo que va a salir en el reporte, en orden.
 *
 * La zona dice que se puede soltar ahi antes de que nadie lo intente, y lo confirma
 * mientras se arrastra algo encima. Reordenar se hace arrastrando en la web y con las
 * flechas en cualquier dispositivo: el arrastre nunca es la unica forma.
 */
export function ColumnasSeleccionadas({
  definicion, columnas, destacada, onSoltar, onSoltarEn, onQuitar, onMover,
}: Props) {
  return (
    <ZonaSoltar onSoltar={onSoltar} style={styles.zona}>
      {(encima: boolean) => (
        <View style={encima ? styles.zonaActiva : undefined}>
          {encima ? (
            <Text style={styles.soltar}>Soltá acá para agregarlo al reporte</Text>
          ) : null}

          {columnas.length === 0 && !encima ? (
            <View style={styles.vacio}>
              <Text style={styles.vacioTitulo}>Tu reporte todavía está vacío</Text>
              <Text style={styles.vacioTexto}>
                Elegí datos de la lista de la izquierda con «+ Agregar», o arrastralos
                hasta acá.
              </Text>
            </View>
          ) : null}

          {columnas.map((clave, indice) => (
            <ZonaSoltar
              key={clave}
              onSoltar={(arrastrada) => onSoltarEn(arrastrada, indice)}
            >
              <Arrastrable
                carga={clave}
                style={[styles.fila, clave === destacada ? styles.filaNueva : null]}
              >
                <Icono nombre="reorder-three-outline" tamano={20} color={colores.linea} />
                <Text style={styles.orden}>{indice + 1}</Text>
                <Text style={styles.nombre} numberOfLines={1}>
                  {etiquetaDe(definicion, clave)}
                </Text>
                <View style={styles.acciones}>
                  <Boton
                    icono="arrow-up"
                    etiqueta={'Subir ' + etiquetaDe(definicion, clave)}
                    onPress={() => onMover(indice, indice - 1)}
                  />
                  <Boton
                    icono="arrow-down"
                    etiqueta={'Bajar ' + etiquetaDe(definicion, clave)}
                    onPress={() => onMover(indice, indice + 1)}
                  />
                  <Boton
                    icono="close"
                    etiqueta={'Quitar ' + etiquetaDe(definicion, clave)}
                    onPress={() => onQuitar(clave)}
                  />
                </View>
              </Arrastrable>
            </ZonaSoltar>
          ))}
        </View>
      )}
    </ZonaSoltar>
  );
}

function Boton({
  icono, etiqueta, onPress,
}: {
  icono: NombreIcono;
  etiqueta: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={styles.boton}
      accessibilityRole="button"
      accessibilityLabel={etiqueta}
    >
      <Icono nombre={icono} tamano={18} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  zona: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colores.linea,
    borderRadius: radios.l,
    backgroundColor: colores.papel,
    padding: espaciado.m,
    minHeight: 220,
  },
  zonaActiva: { opacity: 1 },
  soltar: {
    fontFamily: tipografia.familias.cuerpoFuerte,
    fontSize: tipografia.escala.cuerpo,
    color: colores.accion,
    textAlign: 'center',
    paddingVertical: espaciado.m,
  },
  vacio: { paddingVertical: espaciado.l, paddingHorizontal: espaciado.s },
  vacioTitulo: {
    fontFamily: tipografia.familias.cuerpoFuerte,
    fontSize: tipografia.escala.cuerpo,
    color: colores.tinta,
    marginBottom: 6,
  },
  vacioTexto: {
    fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.escala.nota,
    color: colores.tintaSuave,
    lineHeight: 20,
  },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.s,
    minHeight: 56,
    borderWidth: 1,
    borderColor: colores.linea,
    borderRadius: radios.m,
    backgroundColor: colores.superficie,
    paddingVertical: espaciado.s,
    paddingHorizontal: espaciado.m,
    marginBottom: espaciado.s,
  },
  // Confirmacion de que el campo entro, sin necesidad de buscarlo con la vista.
  filaNueva: { borderColor: colores.accion, backgroundColor: colores.papel },
  orden: {
    width: 22,
    fontFamily: tipografia.familias.cuerpoFuerte,
    fontSize: tipografia.escala.nota,
    color: colores.tintaSuave,
  },
  nombre: {
    flex: 1,
    fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.escala.cuerpo,
    color: colores.tinta,
  },
  acciones: { flexDirection: 'row', gap: 4 },
  boton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radios.m,
    borderWidth: 1,
    borderColor: colores.linea,
    backgroundColor: colores.papel,
  },
});
