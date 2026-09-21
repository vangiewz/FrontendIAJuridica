import React from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Icono, NombreIcono } from '../shared/Icono';
import type { RecordatoriosLlamada } from '../../controllers/llamada/useRecordatoriosLlamada';
import {
  deClave, fechaCorta, fechaLarga, fechaSinDia, horaTexto, zonaHoraria, deClaveFecha, FechaSimple, HoraSimple,
} from '../../services/recordatorios/fechas';
import { describirRecurrencia, proximaOcurrencia, RecordatorioJuridico } from '../../services/recordatorios/modelo';
import { PropuestaRecordatorio } from '../../services/recordatorios/propuesta';
import { colores, espaciado, radios, tipografia } from '../../theme';

/**
 * El panel de UN recordatorio, según lo que esté pasando:
 *  1. una CANCELACIÓN esperando confirmación,
 *  2. una PROPUESTA (fecha y hora concretas) esperando confirmación, o una oferta de una fecha del documento,
 *  3. el DETALLE de un recordatorio ya programado (p. ej. al tocar su notificación).
 *
 * Nada de lo que hay aquí programa por sí solo: [Confirmar] es lo único que crea o cambia un aviso.
 */
export function ContenidoRecordatorio({ r }: { r: RecordatoriosLlamada }) {
  if (r.cancelando) return <Cancelacion r={r} rec={r.cancelando} />;
  if (r.propuesta) return <Propuesta r={r} p={r.propuesta} />;
  if (r.abierto) return <Detalle r={r} rec={r.abierto} />;
  return <View style={styles.vacio}><Text style={styles.nota}>No hay ningún recordatorio abierto.</Text></View>;
}

const cuandoTexto = (p: PropuestaRecordatorio) => {
  if (!p.fecha) return 'Falta la fecha';
  if (p.repeticion) return describirRecurrencia(p.repeticion, p.hora);
  return `${fechaCorta(p.fecha)} · ${horaTexto(p.hora)}`;
};

// ── 2. Propuesta ────────────────────────────────────────────────────────────────────────
function Propuesta({ r, p }: { r: RecordatoriosLlamada; p: PropuestaRecordatorio }) {
  const oferta = p.modo === 'oferta';
  const listo = !!p.fecha && !p.pendiente && !oferta;
  const notas: string[] = [];
  if (!oferta && p.horaOrigen === 'inferida') notas.push(`Entendí las ${horaTexto(p.hora)}. Cámbiala si no es esa hora.`);
  if (!oferta && p.horaOrigen === 'defecto') notas.push(`Puse las ${horaTexto(p.hora)}, la hora por defecto. Puedes cambiarla.`);
  if (p.aproximada === 'dia_semana') notas.push('Elegí ese día porque solo dijiste el día de la semana.');
  if (p.aproximada === 'anio' && p.fecha) notas.push(`No dijiste el año: usé ${p.fecha.anio}.`);
  if (p.aproximada === 'dia_mes') notas.push('Elegí la próxima vez que cae ese día del mes.');
  notas.push(...p.avisos);

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <Text style={styles.titulo}>{oferta ? 'Fecha del documento' : p.editandoId ? 'Cambiar recordatorio' : 'Recordatorio'}</Text>
      <Text style={styles.tituloRec} numberOfLines={2}>{p.titulo}</Text>
      {p.documento ? <Fila icono="document-text-outline" texto={p.documento.nombre} /> : null}
      {p.referencia && !p.repeticion && !oferta ? <Fila icono="calendar-outline" texto={`Fecha de referencia: ${fechaCorta(p.referencia)}`} /> : null}

      <View style={styles.caja}>
        <Text style={styles.cajaEtiqueta}>{oferta ? 'Fecha encontrada' : 'Te avisaré'}</Text>
        <Text style={styles.cajaValor}>{oferta && p.fecha ? fechaSinDia(p.fecha) : cuandoTexto(p)}</Text>
        {p.fecha && !p.repeticion ? <Text style={styles.cajaSub}>{fechaLarga(p.fecha)}</Text> : null}
        {zonaHoraria() ? <Text style={styles.cajaSub}>Hora del dispositivo · {zonaHoraria()}</Text> : null}
      </View>

      {oferta ? (
        <Text style={styles.nota}>Es la fecha tal como aparece en el documento. No sé si es un vencimiento; tú decides si te sirve.</Text>
      ) : null}
      {notas.map((n, i) => <Text key={i} style={styles.nota}>{n}</Text>)}
      {p.pendiente ? <Text style={styles.error}>{p.pendiente.mensaje}</Text> : null}
      {r.aviso ? <Text style={styles.error}>{r.aviso}</Text> : null}

      {r.permiso ? (
        <View style={styles.permiso}>
          <Text style={styles.error}>No tengo permiso para enviarte recordatorios.</Text>
          <View style={styles.fila}>
            <Boton texto="Intentar nuevamente" onPress={r.reintentarPermiso} compacto />
            {r.permiso === 'denegado_definitivo' ? <Boton texto="Abrir configuración" onPress={r.abrirAjustes} secundario compacto /> : null}
          </View>
        </View>
      ) : null}

      {oferta ? (
        <>
          <Boton texto="Crear recordatorio" onPress={() => r.responder('confirmar')} />
          <Boton texto="No, gracias" onPress={r.descartarPropuesta} secundario />
        </>
      ) : (
        <>
          <Boton texto={r.guardando ? 'Programando…' : p.editandoId ? 'Confirmar cambio' : 'Confirmar'} onPress={r.confirmar} deshabilitado={!listo || r.guardando} cargando={r.guardando} />
          <View style={styles.fila}>
            <Boton texto="Cambiar fecha" onPress={r.elegirFecha} secundario compacto deshabilitado={r.guardando || !!p.repeticion && p.repeticion.tipo === 'diaria'} />
            <Boton texto="Cambiar hora" onPress={r.elegirHora} secundario compacto deshabilitado={r.guardando} />
          </View>
          <Boton texto="Cancelar" onPress={r.descartarPropuesta} secundario peligro deshabilitado={r.guardando} />
        </>
      )}
    </ScrollView>
  );
}

// ── 1. Cancelación ──────────────────────────────────────────────────────────────────────
function Cancelacion({ r, rec }: { r: RecordatoriosLlamada; rec: RecordatorioJuridico }) {
  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <Text style={styles.titulo}>¿Cancelar recordatorio?</Text>
      <Text style={styles.tituloRec} numberOfLines={2}>{rec.titulo}</Text>
      <Fila icono="time-outline" texto={cuandoDe(rec)} />
      {rec.documentoNombre ? <Fila icono="document-text-outline" texto={rec.documentoNombre} /> : null}
      <Text style={styles.nota}>Dejará de avisarte. Esto no borra el documento.</Text>
      {r.aviso ? <Text style={styles.error}>{r.aviso}</Text> : null}
      <Boton texto={r.guardando ? 'Cancelando…' : 'Cancelar recordatorio'} onPress={r.confirmarCancelacion} peligro cargando={r.guardando} deshabilitado={r.guardando} />
      <Boton texto="Volver" onPress={r.volverDeCancelacion} secundario deshabilitado={r.guardando} />
    </ScrollView>
  );
}

// ── 3. Detalle ──────────────────────────────────────────────────────────────────────────
export function cuandoDe(rec: RecordatorioJuridico): string {
  const base = deClave(rec.fechaHora);
  if (!base) return '';
  if (rec.repeticion) return `Se repite: ${describirRecurrencia(rec.repeticion, base.hora)}`;
  return `${fechaCorta(base.fecha)} · ${horaTexto(base.hora)}`;
}

function Detalle({ r, rec }: { r: RecordatoriosLlamada; rec: RecordatorioJuridico }) {
  const referencia = deClaveFecha(rec.fechaReferencia);
  const estadoDoc = rec.documentoId ? r.documentos[rec.documentoId] : undefined;
  const prox = proximaOcurrencia(rec, new Date());
  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <Text style={styles.titulo}>Recordatorio</Text>
      <Text style={styles.tituloRec} numberOfLines={3}>{rec.titulo}</Text>

      <View style={styles.caja}>
        <Text style={styles.cajaEtiqueta}>{rec.estado === 'pasado' ? 'Fue el' : rec.repeticion ? 'Próximo aviso' : 'Te avisaré'}</Text>
        <Text style={styles.cajaValor}>{prox ? `${fechaCorta(prox.fecha)} · ${horaTexto(prox.hora)}` : ''}</Text>
        {rec.repeticion ? <Text style={styles.cajaSub}>{cuandoDe(rec)}</Text> : null}
      </View>
      {referencia ? <Fila icono="calendar-outline" texto={`Fecha del documento: ${fechaCorta(referencia)}`} /> : null}

      {rec.documentoId ? (
        <View style={styles.doc}>
          <Fila icono="document-text-outline" texto={rec.documentoNombre ?? 'Documento'} />
          {estadoDoc === 'no_existe' ? (
            <Text style={styles.nota}>El documento asociado ya no está disponible. El recordatorio sigue funcionando.</Text>
          ) : estadoDoc === 'verificando' ? (
            <View style={styles.fila}><ActivityIndicator color={colores.accion} size="small" /><Text style={styles.nota}>Comprobando el documento…</Text></View>
          ) : (
            <Boton texto="Ver documento" onPress={() => { void r.verDocumento(rec); }} secundario />
          )}
        </View>
      ) : null}

      {rec.estado === 'perdido' ? (
        <Text style={styles.error}>Este recordatorio ya no está programado en el teléfono. Puedes reprogramarlo.</Text>
      ) : null}
      {r.aviso ? <Text style={styles.nota}>{r.aviso}</Text> : null}

      <View style={styles.fila}>
        <Boton texto={rec.estado === 'perdido' ? 'Reprogramar' : 'Editar'} onPress={() => r.editar(rec)} secundario compacto />
        <Boton texto="Posponer" onPress={() => r.posponer(rec)} secundario compacto />
      </View>
      <Boton texto="Cancelar recordatorio" onPress={() => r.iniciarCancelacion(rec)} secundario peligro />
      <Boton texto="Ver todos" onPress={r.abrirLista} secundario />
    </ScrollView>
  );
}

// ── Piezas ──────────────────────────────────────────────────────────────────────────────
function Fila({ icono, texto }: { icono: NombreIcono; texto: string }) {
  return (
    <View style={styles.filaDato}>
      <Icono nombre={icono} tamano={18} color={colores.tintaSuave} />
      <Text style={styles.filaTexto} numberOfLines={2}>{texto}</Text>
    </View>
  );
}

function Boton({ texto, onPress, secundario, compacto, peligro, deshabilitado, cargando }: {
  texto: string; onPress: () => void; secundario?: boolean; compacto?: boolean; peligro?: boolean; deshabilitado?: boolean; cargando?: boolean;
}) {
  return (
    <Pressable onPress={onPress} disabled={deshabilitado} accessibilityRole="button"
      style={[styles.boton, secundario && styles.botonSecundario, compacto && styles.botonCompacto, peligro && styles.botonPeligro,
        !secundario && peligro && styles.botonPeligroLleno, deshabilitado && styles.inactivo]}>
      {cargando ? <ActivityIndicator color={secundario ? colores.accion : colores.accionTexto} size="small" /> : null}
      <Text style={[styles.botonTexto, secundario && styles.botonTextoSecundario, peligro && secundario && styles.botonTextoPeligro]}>{texto}</Text>
    </Pressable>
  );
}

export type { FechaSimple, HoraSimple };

const styles = StyleSheet.create({
  scroll: { padding: espaciado.m, paddingBottom: espaciado.xl, gap: espaciado.s },
  vacio: { padding: espaciado.m },
  titulo: { fontFamily: tipografia.familias.cuerpoFuerte, fontSize: tipografia.escala.nota, color: colores.tintaSuave, textTransform: 'uppercase', letterSpacing: 0.5 },
  tituloRec: { fontFamily: tipografia.familias.titulo, fontSize: tipografia.escala.subtitulo, color: colores.tinta },
  filaDato: { flexDirection: 'row', alignItems: 'center', gap: espaciado.s },
  filaTexto: { flex: 1, fontFamily: tipografia.familias.cuerpo, fontSize: tipografia.escala.nota, color: colores.tinta },
  caja: { borderWidth: 1, borderColor: colores.accion, borderRadius: radios.m, padding: espaciado.m, backgroundColor: colores.papel, gap: 2 },
  cajaEtiqueta: { fontFamily: tipografia.familias.cuerpoFuerte, fontSize: tipografia.escala.nota, color: colores.tintaSuave },
  cajaValor: { fontFamily: tipografia.familias.titulo, fontSize: tipografia.escala.titulo, color: colores.tinta },
  cajaSub: { fontFamily: tipografia.familias.cuerpo, fontSize: 13, color: colores.tintaSuave },
  nota: { fontFamily: tipografia.familias.cuerpo, fontSize: tipografia.escala.nota, color: colores.tintaSuave, lineHeight: 20 },
  error: { fontFamily: tipografia.familias.cuerpoFuerte, fontSize: tipografia.escala.nota, color: colores.alerta, lineHeight: 20 },
  permiso: { gap: espaciado.s, borderWidth: 1, borderColor: colores.alerta, borderRadius: radios.m, padding: espaciado.m },
  doc: { gap: espaciado.xs },
  fila: { flexDirection: 'row', alignItems: 'center', gap: espaciado.s },
  boton: { minHeight: 48, flexDirection: 'row', gap: espaciado.s, alignItems: 'center', justifyContent: 'center', borderRadius: radios.m, backgroundColor: colores.accion, paddingHorizontal: espaciado.m },
  botonSecundario: { backgroundColor: colores.superficie, borderWidth: 1, borderColor: colores.accion },
  botonCompacto: { flex: 1 },
  botonPeligro: { borderColor: colores.alerta },
  botonPeligroLleno: { backgroundColor: colores.alerta },
  inactivo: { opacity: 0.4 },
  botonTexto: { fontFamily: tipografia.familias.cuerpoFuerte, fontSize: tipografia.escala.cuerpo, color: colores.accionTexto },
  botonTextoSecundario: { color: colores.accion },
  botonTextoPeligro: { color: colores.alerta },
});
