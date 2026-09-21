import React, { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Icono } from '../shared/Icono';
import { Operacion } from '../../models/llamada';
import { ArchivoRecibido, describirArchivo, RecepcionFallida } from '../../services/archivos/tiposArchivo';
import { colores, espaciado, radios, tipografia } from '../../theme';

interface Props {
  recibidos: ArchivoRecibido[];
  fallidos: RecepcionFallida[];
  /** Operación en curso (subiendo, analizando…): mientras corre no se puede lanzar otra. */
  operacion: Operacion | null;
  alAnalizar: (id: string) => void;
  alDescartar: (id: string) => void;
}

/**
 * «Archivo recibido»: lo que otra app (WhatsApp, Gmail, Drive, Archivos…) compartió con esta.
 * NADA se analiza ni se sube por su cuenta: primero se muestra y el usuario decide. La copia
 * vive en la caché privada de la app hasta que se analiza o se cancela.
 */
export function ContenidoRecibido({ recibidos, fallidos, operacion, alAnalizar, alDescartar }: Props) {
  const [verInformacion, setVerInformacion] = useState<string | null>(null);
  const ocupado = operacion !== null;

  if (recibidos.length === 0 && fallidos.length === 0) {
    return <View style={styles.vacio}><Text style={styles.nota}>No hay archivos recibidos.</Text></View>;
  }

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <Text style={styles.titulo}>{recibidos.length + fallidos.length === 1 ? 'Archivo recibido' : 'Archivos recibidos'}</Text>

      {ocupado ? (
        <View style={styles.progreso}>
          <ActivityIndicator color={colores.accion} />
          <Text style={styles.progresoTexto} accessibilityLiveRegion="polite">{operacion.texto}</Text>
        </View>
      ) : null}

      {recibidos.map((r) => (
        <View key={r.id} style={styles.tarjeta}>
          <View style={styles.cabecera}>
            <Icono nombre="document-text-outline" tamano={28} color={colores.accion} />
            <View style={styles.cabeceraTextos}>
              <Text style={styles.nombre} numberOfLines={2}>{r.nombre}</Text>
              <Text style={styles.detalle}>{describirArchivo(r)}</Text>
            </View>
          </View>

          {verInformacion === r.id ? (
            <View style={styles.informacion}>
              <Dato etiqueta="Nombre" valor={r.nombre} />
              <Dato etiqueta="Formato" valor={describirArchivo(r)} />
              <Dato etiqueta="Tipo" valor={r.mime} />
              <Text style={styles.nota}>
                Está en la memoria privada de la app. No se sube ni se analiza hasta que lo pidas.
              </Text>
            </View>
          ) : null}

          <Text style={styles.pregunta}>¿Qué querés hacer?</Text>
          <Boton texto="Analizar" onPress={() => alAnalizar(r.id)} deshabilitado={ocupado} />
          <View style={styles.fila}>
            <Boton texto={verInformacion === r.id ? 'Ocultar información' : 'Ver información'} secundario compacto
              onPress={() => setVerInformacion(verInformacion === r.id ? null : r.id)} />
            <Boton texto="Cancelar" secundario compacto peligro onPress={() => alDescartar(r.id)} deshabilitado={ocupado} />
          </View>
        </View>
      ))}

      {fallidos.map((f) => (
        <View key={f.id} style={[styles.tarjeta, styles.tarjetaError]}>
          <View style={styles.cabecera}>
            <Icono nombre="alert-circle-outline" tamano={28} color={colores.alerta} />
            <View style={styles.cabeceraTextos}>
              {f.nombre ? <Text style={styles.nombre} numberOfLines={2}>{f.nombre}</Text> : null}
              <Text style={styles.error}>{f.mensaje}</Text>
            </View>
          </View>
          <Boton texto="Cerrar" secundario onPress={() => alDescartar(f.id)} />
        </View>
      ))}
    </ScrollView>
  );
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <View style={styles.dato}>
      <Text style={styles.datoEtiqueta}>{etiqueta}</Text>
      <Text style={styles.datoValor} selectable>{valor}</Text>
    </View>
  );
}

function Boton({ texto, onPress, secundario, compacto, peligro, deshabilitado }: {
  texto: string; onPress: () => void; secundario?: boolean; compacto?: boolean; peligro?: boolean; deshabilitado?: boolean;
}) {
  return (
    <Pressable onPress={onPress} disabled={deshabilitado} accessibilityRole="button"
      style={[styles.boton, secundario && styles.botonSecundario, compacto && styles.botonCompacto,
        peligro && styles.botonPeligro, deshabilitado && styles.inactivo]}>
      <Text style={[styles.botonTexto, secundario && styles.botonTextoSecundario, peligro && styles.botonTextoPeligro]}>{texto}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: espaciado.m, paddingBottom: espaciado.xl, gap: espaciado.m },
  vacio: { padding: espaciado.m },
  titulo: { fontFamily: tipografia.familias.titulo, fontSize: tipografia.escala.subtitulo, color: colores.tinta },
  nota: { fontFamily: tipografia.familias.cuerpo, fontSize: tipografia.escala.nota, color: colores.tintaSuave, lineHeight: 20 },
  progreso: { flexDirection: 'row', alignItems: 'center', gap: espaciado.s },
  progresoTexto: { flex: 1, fontFamily: tipografia.familias.cuerpoFuerte, fontSize: tipografia.escala.cuerpo, color: colores.tinta },
  tarjeta: {
    borderWidth: 1, borderColor: colores.linea, borderRadius: radios.m, backgroundColor: colores.papel,
    padding: espaciado.m, gap: espaciado.s,
  },
  tarjetaError: { borderColor: colores.alerta },
  cabecera: { flexDirection: 'row', alignItems: 'center', gap: espaciado.m },
  cabeceraTextos: { flex: 1, gap: 2 },
  nombre: { fontFamily: tipografia.familias.cuerpoFuerte, fontSize: tipografia.escala.cuerpo, color: colores.tinta },
  detalle: { fontFamily: tipografia.familias.cuerpo, fontSize: tipografia.escala.nota, color: colores.tintaSuave },
  error: { fontFamily: tipografia.familias.cuerpo, fontSize: tipografia.escala.nota, color: colores.alerta, lineHeight: 20 },
  informacion: { gap: espaciado.xs, paddingVertical: espaciado.xs },
  dato: { gap: 0 },
  datoEtiqueta: { fontFamily: tipografia.familias.cuerpoFuerte, fontSize: 12, color: colores.tintaSuave },
  datoValor: { fontFamily: tipografia.familias.cuerpo, fontSize: tipografia.escala.nota, color: colores.tinta },
  pregunta: { fontFamily: tipografia.familias.cuerpoFuerte, fontSize: tipografia.escala.nota, color: colores.tintaSuave },
  fila: { flexDirection: 'row', gap: espaciado.s },
  boton: { minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: radios.m, backgroundColor: colores.accion, paddingHorizontal: espaciado.m },
  botonSecundario: { backgroundColor: colores.superficie, borderWidth: 1, borderColor: colores.accion },
  botonCompacto: { flex: 1 },
  botonPeligro: { borderColor: colores.alerta },
  inactivo: { opacity: 0.4 },
  botonTexto: { fontFamily: tipografia.familias.cuerpoFuerte, fontSize: tipografia.escala.cuerpo, color: colores.accionTexto },
  botonTextoSecundario: { color: colores.accion },
  botonTextoPeligro: { color: colores.alerta },
});
