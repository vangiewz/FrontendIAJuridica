import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Icono } from '../shared/Icono';
import { ETIQUETA_FORMATO, FormatoSalida } from '../../services/archivos/tiposArchivo';
import type { EstadoSalida } from '../../controllers/llamada/useSalidaLlamada';
import { colores, espaciado, radios, tipografia } from '../../theme';

interface Props {
  /** Formatos en que el backend exporta ESTE resultado; el primero es el que se propone. */
  formatos: FormatoSalida[];
  /** Lo que se está preparando ahora, si es de este resultado. */
  preparando: EstadoSalida | null;
  resultado: { tipo: 'ok' | 'error'; texto: string } | null;
  alGuardar: (formato: FormatoSalida) => void;
  alCompartir: (formato: FormatoSalida) => void;
}

/**
 * 💾 Guardar · 📤 Compartir para un documento generado o un reporte. El archivo es el que exporta
 * el backend, en el formato elegido. Compartir abre el share sheet de Android (WhatsApp, Gmail,
 * Drive, Archivos…); Guardar abre el selector de carpeta del sistema: el usuario decide dónde.
 */
export function BarraSalida({ formatos, preparando, resultado, alGuardar, alCompartir }: Props) {
  const [formato, setFormato] = useState<FormatoSalida>(formatos[0]);
  const ocupado = preparando !== null;

  return (
    <View style={styles.raiz}>
      {formatos.length > 1 ? (
        <View style={styles.formatos}>
          <Text style={styles.etiqueta}>Formato:</Text>
          {formatos.map((f) => (
            <Pressable key={f} onPress={() => setFormato(f)} disabled={ocupado} accessibilityRole="radio"
              accessibilityState={{ selected: formato === f }}
              style={[styles.formato, formato === f && styles.formatoActivo]}>
              <Text style={[styles.formatoTexto, formato === f && styles.formatoTextoActivo]}>{ETIQUETA_FORMATO[f]}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      <View style={styles.botones}>
        <Boton icono="download-outline" texto="Guardar" disabled={ocupado} onPress={() => alGuardar(formato)}
          cargando={preparando?.accion === 'guardar'} />
        <Boton icono="share-social-outline" texto="Compartir" disabled={ocupado} onPress={() => alCompartir(formato)}
          cargando={preparando?.accion === 'compartir'} />
      </View>

      {ocupado ? (
        <View style={styles.estado}>
          <ActivityIndicator color={colores.accion} size="small" />
          <Text style={styles.estadoTexto}>Preparando el archivo…</Text>
        </View>
      ) : null}
      {resultado ? (
        <Text style={[styles.resultado, resultado.tipo === 'error' && styles.resultadoError]}
          accessibilityLiveRegion="polite">{resultado.texto}</Text>
      ) : null}
    </View>
  );
}

function Boton({ icono, texto, onPress, disabled, cargando }: {
  icono: React.ComponentProps<typeof Icono>['nombre']; texto: string; onPress: () => void; disabled: boolean; cargando: boolean;
}) {
  return (
    <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityLabel={texto}
      style={({ pressed }) => [styles.boton, (disabled || pressed) && styles.atenuado]}>
      {cargando ? <ActivityIndicator color={colores.accionTexto} size="small" /> : <Icono nombre={icono} tamano={20} color={colores.accionTexto} />}
      <Text style={styles.botonTexto}>{texto}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  raiz: { gap: espaciado.s, marginTop: espaciado.m },
  formatos: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: espaciado.xs },
  etiqueta: { fontFamily: tipografia.familias.cuerpoFuerte, fontSize: tipografia.escala.nota, color: colores.tintaSuave },
  formato: {
    minHeight: 40, paddingHorizontal: espaciado.m, justifyContent: 'center', borderRadius: radios.round,
    borderWidth: 1, borderColor: colores.linea, backgroundColor: colores.papel,
  },
  formatoActivo: { backgroundColor: colores.accion, borderColor: colores.accion },
  formatoTexto: { fontFamily: tipografia.familias.cuerpoFuerte, fontSize: tipografia.escala.nota, color: colores.tinta },
  formatoTextoActivo: { color: colores.accionTexto },
  botones: { flexDirection: 'row', gap: espaciado.s },
  boton: {
    flex: 1, minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: espaciado.s,
    borderRadius: radios.m, backgroundColor: colores.accion,
  },
  botonTexto: { fontFamily: tipografia.familias.cuerpoFuerte, fontSize: tipografia.escala.cuerpo, color: colores.accionTexto },
  atenuado: { opacity: 0.55 },
  estado: { flexDirection: 'row', alignItems: 'center', gap: espaciado.s },
  estadoTexto: { fontFamily: tipografia.familias.cuerpo, fontSize: tipografia.escala.nota, color: colores.tintaSuave },
  resultado: { fontFamily: tipografia.familias.cuerpoFuerte, fontSize: tipografia.escala.nota, color: colores.accion },
  resultadoError: { color: colores.alerta },
});
