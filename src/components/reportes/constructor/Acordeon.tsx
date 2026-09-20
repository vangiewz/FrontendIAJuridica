import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Icono, NombreIcono } from '../../shared/Icono';
import { colores, espaciado, radios, tipografia } from '../../../theme';

interface Props {
  icono: NombreIcono;
  titulo: string;
  descripcion: string;
  /** Lo que ya esta configurado, para verlo sin abrir ("1 filtro activo"). */
  resumen?: string;
  abierto: boolean;
  onAlternar: () => void;
  onAyuda?: () => void;
  children: React.ReactNode;
}

/**
 * Una tarjeta plegable por ajuste.
 *
 * Todos arrancan cerrados: quien solo quiere una lista de datos no tiene por que ver
 * filtros, agrupaciones y calculos al mismo tiempo. El encabezado dice para que sirve
 * cada uno en una linea, y muestra lo ya configurado sin necesidad de abrirlo.
 */
export function Acordeon({
  icono, titulo, descripcion, resumen, abierto, onAlternar, onAyuda, children,
}: Props) {
  return (
    <View style={[styles.tarjeta, abierto && styles.tarjetaAbierta]}>
      <View style={styles.filaCabecera}>
      <Pressable
        onPress={onAlternar}
        style={styles.cabecera}
        accessibilityRole="button"
        accessibilityState={{ expanded: abierto }}
        accessibilityLabel={titulo + '. ' + descripcion}
      >
        <Icono nombre={icono} tamano={24} color={abierto ? colores.accion : colores.tintaSuave} />
        <View style={styles.textos}>
          <Text style={styles.titulo}>{titulo}</Text>
          <Text style={styles.descripcion}>{descripcion}</Text>
        </View>
        {resumen ? <Text style={styles.resumen}>{resumen}</Text> : null}
        <Icono nombre={abierto ? 'chevron-down' : 'chevron-forward'} tamano={20} />
      </Pressable>
      {onAyuda ? <Pressable onPress={onAyuda} style={styles.ayudaBoton}
        accessibilityRole="button" accessibilityLabel={`Ayuda sobre ${titulo}`}>
        <Icono nombre="help-circle-outline" tamano={20} color={colores.accion} />
      </Pressable> : null}
      </View>
      {abierto ? <View style={styles.cuerpo}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  tarjeta: {
    borderWidth: 1,
    borderColor: colores.linea,
    borderRadius: radios.l,
    backgroundColor: colores.superficie,
    marginBottom: espaciado.s,
    overflow: 'hidden',
  },
  tarjetaAbierta: { borderColor: colores.accion },
  filaCabecera: { flexDirection: 'row', alignItems: 'center' },
  cabecera: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.m,
    minHeight: 64,
    paddingVertical: espaciado.m,
    paddingHorizontal: espaciado.l,
  },
  ayudaBoton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center',
    marginRight: espaciado.s },
  textos: { flex: 1 },
  titulo: {
    fontFamily: tipografia.familias.cuerpoFuerte,
    fontSize: tipografia.escala.cuerpo,
    color: colores.tinta,
  },
  descripcion: {
    fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.escala.nota,
    color: colores.tintaSuave,
    marginTop: 2,
  },
  resumen: {
    fontFamily: tipografia.familias.cuerpoFuerte,
    fontSize: tipografia.escala.nota,
    color: colores.accion,
  },
  cuerpo: {
    paddingHorizontal: espaciado.l,
    paddingBottom: espaciado.l,
    borderTopWidth: 1,
    borderTopColor: colores.linea,
    paddingTop: espaciado.m,
  },
});
