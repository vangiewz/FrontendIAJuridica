import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Icono, NombreIcono } from '../shared/Icono';
import type { RecordatoriosLlamada } from '../../controllers/llamada/useRecordatoriosLlamada';
import { deClave, deClaveFecha, fechaBreve, fechaCorta, horaTexto } from '../../services/recordatorios/fechas';
import { describirRecurrencia, nombreCorto, proximaOcurrencia, RecordatorioJuridico } from '../../services/recordatorios/modelo';
import { colores, espaciado, radios, tipografia } from '../../theme';

const ICONO: Record<RecordatorioJuridico['tipo'], NombreIcono> = {
  vencimiento: 'calendar-outline', pago: 'cash-outline', revision: 'document-text-outline', seguimiento: 'eye-outline',
  audiencia: 'megaphone-outline', personalizado: 'notifications-outline',
};

/** «Próximos» y «Anteriores»: los recordatorios de ESTE teléfono. Cada uno se abre, se edita o se cancela. */
export function ContenidoRecordatorios({ r }: { r: RecordatoriosLlamada }) {
  const proximos = r.recordatorios.filter((x) => x.estado !== 'pasado');
  const anteriores = r.recordatorios.filter((x) => x.estado === 'pasado');

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <Text style={styles.titulo}>Recordatorios</Text>
      <Text style={styles.nota}>Viven en este teléfono y suenan aunque no haya Internet ni el servidor esté encendido.</Text>

      <Text style={styles.seccion}>Próximos</Text>
      {proximos.length === 0 ? (
        <Text style={styles.nota}>No tienes recordatorios programados. Dime, por ejemplo: «recordame revisar este contrato mañana».</Text>
      ) : proximos.map((rec) => <Fila key={rec.id} r={r} rec={rec} />)}

      {anteriores.length > 0 ? (
        <>
          <Text style={styles.seccion}>Anteriores</Text>
          {anteriores.map((rec) => <Fila key={rec.id} r={r} rec={rec} />)}
        </>
      ) : null}

      <Pressable onPress={r.crearManual} accessibilityRole="button" style={styles.nuevo}>
        <Icono nombre="add-circle-outline" tamano={20} color={colores.accion} />
        <Text style={styles.nuevoTexto}>Crear un recordatorio</Text>
      </Pressable>
    </ScrollView>
  );
}

function Fila({ r, rec }: { r: RecordatoriosLlamada; rec: RecordatorioJuridico }) {
  const prox = proximaOcurrencia(rec, new Date());
  const referencia = deClaveFecha(rec.fechaReferencia);
  const base = deClave(rec.fechaHora);
  const sub = rec.repeticion && base ? describirRecurrencia(rec.repeticion, base.hora)
    : referencia ? `Vence el ${fechaCorta(referencia)}` : null;
  return (
    <View style={[styles.item, rec.estado === 'pasado' && styles.itemPasado]}>
      <Pressable onPress={() => r.abrir(rec)} accessibilityRole="button" accessibilityLabel={`Abrir recordatorio ${rec.titulo}`} style={styles.principal}>
        <View style={styles.fecha}>
          <Text style={styles.fechaDia}>{prox ? fechaBreve(prox.fecha) : ''}</Text>
          <Text style={styles.fechaHora}>{prox ? horaTexto(prox.hora) : ''}</Text>
        </View>
        <View style={styles.textos}>
          <View style={styles.tituloFila}>
            <Icono nombre={ICONO[rec.tipo]} tamano={16} color={colores.accion} />
            <Text style={styles.itemTitulo} numberOfLines={1}>{rec.titulo}</Text>
          </View>
          {rec.documentoNombre ? <Text style={styles.sub} numberOfLines={1}>📄 {nombreCorto(rec.documentoNombre, 34)}</Text> : null}
          {sub ? <Text style={styles.sub} numberOfLines={1}>{sub}</Text> : null}
          {rec.estado === 'perdido' ? <Text style={styles.alerta}>No está programado en el teléfono</Text> : null}
        </View>
      </Pressable>
      <View style={styles.acciones}>
        <Accion icono="create-outline" etiqueta="Editar" onPress={() => r.editar(rec)} />
        <Accion icono="trash-outline" etiqueta="Cancelar" onPress={() => r.iniciarCancelacion(rec)} peligro />
      </View>
    </View>
  );
}

function Accion({ icono, etiqueta, onPress, peligro }: { icono: NombreIcono; etiqueta: string; onPress: () => void; peligro?: boolean }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={etiqueta} hitSlop={6} style={styles.accion}>
      <Icono nombre={icono} tamano={22} color={peligro ? colores.alerta : colores.tintaSuave} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: espaciado.m, paddingBottom: espaciado.xl, gap: espaciado.s },
  titulo: { fontFamily: tipografia.familias.titulo, fontSize: tipografia.escala.subtitulo, color: colores.tinta },
  nota: { fontFamily: tipografia.familias.cuerpo, fontSize: tipografia.escala.nota, color: colores.tintaSuave, lineHeight: 20 },
  seccion: { fontFamily: tipografia.familias.cuerpoFuerte, fontSize: tipografia.escala.nota, color: colores.tintaSuave, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: espaciado.s },
  item: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colores.linea, borderRadius: radios.m, backgroundColor: colores.papel },
  itemPasado: { opacity: 0.6 },
  principal: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: espaciado.m, padding: espaciado.s, minHeight: 64 },
  fecha: { width: 62, alignItems: 'center', backgroundColor: colores.superficie, borderRadius: radios.s, borderWidth: 1, borderColor: colores.linea, paddingVertical: 4 },
  fechaDia: { fontFamily: tipografia.familias.cuerpoFuerte, fontSize: 13, color: colores.tinta },
  fechaHora: { fontFamily: tipografia.familias.cuerpo, fontSize: 13, color: colores.tintaSuave },
  textos: { flex: 1, gap: 1 },
  tituloFila: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  itemTitulo: { flex: 1, fontFamily: tipografia.familias.cuerpoFuerte, fontSize: tipografia.escala.cuerpo - 1, color: colores.tinta },
  sub: { fontFamily: tipografia.familias.cuerpo, fontSize: 13, color: colores.tintaSuave },
  alerta: { fontFamily: tipografia.familias.cuerpoFuerte, fontSize: 12, color: colores.alerta },
  acciones: { flexDirection: 'row', paddingRight: espaciado.xs },
  accion: { width: 40, height: 44, alignItems: 'center', justifyContent: 'center' },
  nuevo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: espaciado.s, minHeight: 48, borderRadius: radios.m, borderWidth: 1, borderColor: colores.accion, marginTop: espaciado.s },
  nuevoTexto: { fontFamily: tipografia.familias.cuerpoFuerte, fontSize: tipografia.escala.cuerpo, color: colores.accion },
});
