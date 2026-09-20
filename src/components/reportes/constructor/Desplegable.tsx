import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Icono } from '../../shared/Icono';
import { colores, espaciado, radios, tipografia } from '../../../theme';

export interface OpcionDesplegable {
  clave: string;
  etiqueta: string;
  detalle?: string;
}

interface Props {
  etiqueta: string;
  valor: string;
  opciones: OpcionDesplegable[];
  onElegir: (clave: string) => void;
  marcador?: string;
  ayuda?: string;
}

/**
 * Un desplegable de verdad, con la lista en un panel aparte.
 *
 * Reemplaza a las filas de chips diminutos: el control cerrado dice una sola cosa —lo
 * que esta elegido— y al abrirlo las opciones son filas grandes, faciles de leer y de
 * tocar. Usa el Modal de React Native, asi que funciona igual en web y en el telefono
 * sin agregar ninguna dependencia.
 */
export function Desplegable({ etiqueta, valor, opciones, onElegir, marcador, ayuda }: Props) {
  const [abierto, setAbierto] = useState(false);
  const elegida = opciones.find((o) => o.clave === valor);

  return (
    <View style={styles.contenedor}>
      <Text style={styles.etiqueta}>{etiqueta}</Text>
      <Pressable
        onPress={() => setAbierto(true)}
        style={styles.control}
        accessibilityRole="button"
        accessibilityLabel={etiqueta + ': ' + (elegida?.etiqueta ?? marcador ?? 'sin elegir')}
      >
        <Text style={[styles.valor, !elegida && styles.marcador]} numberOfLines={1}>
          {elegida?.etiqueta ?? marcador ?? 'Elegir...'}
        </Text>
        <Icono nombre="chevron-down" tamano={18} />
      </Pressable>
      {ayuda ? <Text style={styles.ayuda}>{ayuda}</Text> : null}

      <Modal
        visible={abierto}
        transparent
        animationType="fade"
        onRequestClose={() => setAbierto(false)}
      >
        <Pressable style={styles.fondo} onPress={() => setAbierto(false)}>
          <Pressable style={styles.panel} onPress={() => {}}>
            <Text style={styles.tituloPanel}>{etiqueta}</Text>
            <ScrollView style={styles.lista}>
              {opciones.length === 0 ? (
                <Text style={styles.vacio}>No hay opciones disponibles.</Text>
              ) : null}
              {opciones.map((opcion) => {
                const activa = opcion.clave === valor;
                return (
                  <Pressable
                    key={opcion.clave}
                    onPress={() => {
                      onElegir(opcion.clave);
                      setAbierto(false);
                    }}
                    style={[styles.opcion, activa && styles.opcionActiva]}
                    accessibilityRole="button"
                  >
                    <View style={styles.opcionTexto}>
                      <Text style={[styles.opcionEtiqueta, activa && styles.opcionActivaTexto]}>
                        {opcion.etiqueta}
                      </Text>
                      {opcion.detalle ? (
                        <Text style={styles.opcionDetalle}>{opcion.detalle}</Text>
                      ) : null}
                    </View>
                    {activa ? (
                      <Icono nombre="checkmark" tamano={20} color={colores.accion} />
                    ) : null}
                  </Pressable>
                );
              })}
            </ScrollView>
            <Pressable onPress={() => setAbierto(false)} style={styles.cerrar}>
              <Text style={styles.cerrarTexto}>Cerrar</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { minWidth: 220, flexGrow: 1, flexShrink: 1, marginBottom: espaciado.s },
  etiqueta: {
    fontFamily: tipografia.familias.cuerpoFuerte,
    fontSize: tipografia.escala.nota,
    color: colores.tintaSuave,
    marginBottom: 6,
  },
  control: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: espaciado.s,
    minHeight: 48,
    borderWidth: 1,
    borderColor: colores.linea,
    borderRadius: radios.m,
    paddingHorizontal: espaciado.m,
    backgroundColor: colores.superficie,
  },
  valor: {
    flex: 1,
    fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.escala.cuerpo,
    color: colores.tinta,
  },
  marcador: { color: colores.tintaSuave },
  ayuda: {
    fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.escala.nota,
    color: colores.tintaSuave,
    marginTop: 4,
  },
  fondo: {
    flex: 1,
    backgroundColor: 'rgba(34, 32, 28, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: espaciado.l,
  },
  panel: {
    width: '100%',
    maxWidth: 520,
    maxHeight: '80%',
    backgroundColor: colores.superficie,
    borderRadius: radios.l,
    padding: espaciado.l,
  },
  tituloPanel: {
    fontFamily: tipografia.familias.cuerpoFuerte,
    fontSize: tipografia.escala.subtitulo,
    color: colores.tinta,
    marginBottom: espaciado.m,
  },
  lista: { flexGrow: 0 },
  opcion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.s,
    minHeight: 52,
    paddingVertical: espaciado.s,
    paddingHorizontal: espaciado.m,
    borderRadius: radios.m,
    borderWidth: 1,
    borderColor: 'transparent',
    marginBottom: 6,
  },
  opcionActiva: { backgroundColor: colores.papel, borderColor: colores.accion },
  opcionTexto: { flex: 1 },
  opcionEtiqueta: {
    fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.escala.cuerpo,
    color: colores.tinta,
  },
  opcionActivaTexto: { fontFamily: tipografia.familias.cuerpoFuerte },
  opcionDetalle: {
    fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.escala.nota,
    color: colores.tintaSuave,
    marginTop: 2,
  },
  vacio: {
    fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.escala.cuerpo,
    color: colores.tintaSuave,
    padding: espaciado.m,
  },
  cerrar: {
    alignSelf: 'flex-end',
    marginTop: espaciado.s,
    paddingVertical: espaciado.s,
    paddingHorizontal: espaciado.m,
  },
  cerrarTexto: {
    fontFamily: tipografia.familias.cuerpoFuerte,
    fontSize: tipografia.escala.cuerpo,
    color: colores.accion,
  },
});
