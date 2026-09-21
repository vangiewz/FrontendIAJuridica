import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Icono } from '../shared/Icono';
import { EtiquetaTipoDocumento } from '../documentos/EtiquetaTipoDocumento';
import { AnalisisContrato } from '../documentos/AnalisisContrato';
import { RiesgosContractuales } from '../documentos/RiesgosContractuales';
import { InformacionExtraida } from '../documentos/InformacionExtraida';
import { Pestanas } from './Pestanas';
import { Analisis } from '../../models/documentos';
import { FechaDeDocumento } from '../../services/recordatorios/modelo';
import { fechaCorta, fechaSinDia, FechaSimple } from '../../services/recordatorios/fechas';
import { FichaDocumento } from '../../models/llamada';
import { colores, espaciado, radios, tipografia } from '../../theme';

interface Props {
  ficha: FichaDocumento | null;
  analisis: Analisis | null;
  alAnalizar: () => void;
  /** Cambiar o subir otro: abre la selección en este mismo panel. */
  alCambiar: () => void;
  alCerrarDocumento: () => void;
  /** Fechas FUTURAS que el backend ya extrajo del documento (no se inventa ninguna). */
  fechas: FechaDeDocumento[];
  /** Plazos en días hábiles o judiciales que se detectaron: solo se avisan, no se calculan. */
  plazosHabiles: string[];
  recordatoriosDisponibles: boolean;
  alCrearRecordatorio: (fecha: FechaSimple) => void;
}

type Vista = 'resumen' | 'riesgos' | 'detalles' | 'fechas';

/**
 * El documento activo y su análisis, con los mismos componentes de la pantalla de
 * documentos (`AnalisisContrato`, `RiesgosContractuales`, `InformacionExtraida`). Solo se
 * muestra lo que el backend devolvió; si el documento aún no se analizó, se dice.
 */
export function ContenidoDocumento({
  ficha, analisis, alAnalizar, alCambiar, alCerrarDocumento, fechas, plazosHabiles, recordatoriosDisponibles, alCrearRecordatorio,
}: Props) {
  const [vista, setVista] = useState<Vista>('resumen');

  if (!ficha) {
    return (
      <View style={styles.vacio}>
        <Text style={styles.nota}>No hay ningún documento activo en esta llamada.</Text>
        <Accion icono="cloud-upload-outline" texto="Subir un documento" onPress={alCambiar} />
      </View>
    );
  }

  return (
    <View style={styles.raiz}>
      <View style={styles.ficha}>
        <View style={styles.fichaTextos}>
          <Text style={styles.fichaNombre} numberOfLines={2}>
            {ficha.escaneado
              ? `Documento escaneado · ${ficha.escaneado.paginas} ${ficha.escaneado.paginas === 1 ? 'página' : 'páginas'}`
              : ficha.nombre}
          </Text>
          <EtiquetaTipoDocumento tipo={analisis?.tipo_documento ?? ficha.tipo} />
        </View>
        <View style={styles.acciones}>
          <Accion icono="swap-horizontal-outline" texto="Cambiar" onPress={alCambiar} />
          <Accion icono="cloud-upload-outline" texto="Subir otro" onPress={alCambiar} />
          <Accion icono="close-circle-outline" texto="Cerrar documento" onPress={alCerrarDocumento} />
        </View>
      </View>

      {!analisis ? (
        <View style={styles.vacio}>
          <Text style={styles.nota}>Este documento está activo, pero todavía no lo analicé.</Text>
          <Accion icono="search-outline" texto="Analizar ahora" onPress={alAnalizar} />
        </View>
      ) : (
        <>
          <Pestanas activa={vista} onCambiar={setVista}
            pestanas={[{ clave: 'resumen', etiqueta: 'Resumen' },
                       { clave: 'riesgos', etiqueta: `Riesgos (${analisis.riesgos.length})` },
                       { clave: 'detalles', etiqueta: 'Detalles' },
                       ...(recordatoriosDisponibles && (fechas.length > 0 || plazosHabiles.length > 0)
                         ? [{ clave: 'fechas' as const, etiqueta: `Fechas (${fechas.length})` }] : [])]} />
          <ScrollView contentContainerStyle={styles.scroll}>
            {vista === 'resumen' ? <AnalisisContrato analisis={analisis} /> : null}
            {vista === 'riesgos' ? <RiesgosContractuales analisis={analisis} /> : null}
            {vista === 'detalles' ? <InformacionExtraida analisis={analisis} /> : null}
            {vista === 'fechas' ? (
              <View style={styles.fechas}>
                <Text style={styles.nota}>
                  Fechas futuras tal como aparecen en el documento. No sé si alguna es un vencimiento: tú decides si quieres un recordatorio.
                </Text>
                {fechas.map((f) => (
                  <View key={fechaCorta(f.fecha)} style={styles.fechaCaja}>
                    <Text style={styles.fechaTitulo}>📅 {fechaSinDia(f.fecha)}</Text>
                    <Text style={styles.nota} numberOfLines={2}>
                      {f.encabezado ? `En «${f.encabezado}»` : 'Sin cláusula identificada'} · escrito «{f.texto}»
                    </Text>
                    <Accion icono="alarm-outline" texto="Crear recordatorio" onPress={() => alCrearRecordatorio(f.fecha)} />
                  </View>
                ))}
                {fechas.length === 0 ? <Text style={styles.nota}>No encontré fechas futuras en el documento.</Text> : null}
                {plazosHabiles.length > 0 ? (
                  <Text style={styles.advertencia}>
                    El documento habla de plazos en días hábiles o judiciales ({plazosHabiles.join(', ')}). No los calculo:
                    no tengo el calendario de feriados. Si quieres un recordatorio, dime la fecha exacta.
                  </Text>
                ) : null}
              </View>
            ) : null}
          </ScrollView>
        </>
      )}
    </View>
  );
}

function Accion({ icono, texto, onPress }: {
  icono: React.ComponentProps<typeof Icono>['nombre']; texto: string; onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button"
      style={({ pressed }) => [styles.accion, pressed && styles.presionado]}>
      <Icono nombre={icono} tamano={16} color={colores.accion} />
      <Text style={styles.accionTexto}>{texto}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  raiz: { flex: 1 },
  ficha: {
    margin: espaciado.m, marginBottom: 0, padding: espaciado.m, gap: espaciado.s, borderRadius: radios.m,
    borderWidth: 1, borderColor: colores.linea, backgroundColor: colores.papel,
  },
  fichaTextos: { gap: espaciado.xs },
  fichaNombre: { fontFamily: tipografia.familias.cuerpoFuerte, fontSize: tipografia.escala.cuerpo, color: colores.tinta },
  acciones: { flexDirection: 'row', flexWrap: 'wrap', gap: espaciado.xs },
  accion: {
    flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 40, paddingHorizontal: espaciado.s,
    borderRadius: radios.round, borderWidth: 1, borderColor: colores.linea, backgroundColor: colores.superficie,
  },
  accionTexto: { fontFamily: tipografia.familias.cuerpoFuerte, fontSize: tipografia.escala.nota, color: colores.accion },
  presionado: { opacity: 0.6 },
  scroll: { paddingHorizontal: espaciado.m, paddingBottom: espaciado.xl },
  vacio: { padding: espaciado.m, gap: espaciado.s, alignItems: 'flex-start' },
  fechas: { gap: 8, paddingTop: 8 },
  fechaCaja: { borderWidth: 1, borderColor: colores.linea, borderRadius: radios.m, padding: 12, gap: 6, backgroundColor: colores.papel },
  fechaTitulo: { fontFamily: tipografia.familias.cuerpoFuerte, fontSize: tipografia.escala.cuerpo, color: colores.tinta },
  advertencia: { fontFamily: tipografia.familias.cuerpo, fontSize: tipografia.escala.nota, color: colores.destacado, lineHeight: 20, borderLeftWidth: 3, borderLeftColor: colores.destacado, paddingLeft: 8 },
  nota: { fontFamily: tipografia.familias.cuerpo, fontSize: tipografia.escala.nota, color: colores.tintaSuave, lineHeight: 20 },
});
