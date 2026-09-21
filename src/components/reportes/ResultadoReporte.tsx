import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { GraficoBarras, PuntoGrafico } from './GraficoBarras';
import { GraficoProporciones } from './GraficoProporciones';
import { ResumenReporte } from './ResumenReporte';
import { TablaReporte } from './TablaReporte';
import {
  FORMATOS, FormatoExportacion, ReporteResultado, aCsv, ejesDelGrafico, formatearValor,
} from '../../models/reportes';
import { Icono } from '../shared/Icono';
import { descargaDisponible } from '../../services/descargas';
import { colores, espaciado, radios, tipografia } from '../../theme';

interface Props {
  reporte: ReporteResultado;
  /** Sin esto las filas no se abren: la llamada no navega fuera de su pantalla. */
  onAbrirFila?: (id: string) => void;
  onExportar: (formato: FormatoExportacion) => void;
  /** En el teléfono la exportación es guardar/compartir y la ofrece quien lo muestra: aquí no se repite. */
  sinExportacion?: boolean;
  exportando: FormatoExportacion | null;
}

/**
 * El resultado de un reporte, venga de donde venga.
 *
 * Lo usan por igual el modo por lenguaje natural y el constructor visual: los dos
 * terminan en la misma `ReporteEspecificacion` y en el mismo `ReporteResultado`, asi
 * que tienen que verse identicos y exportarse por el mismo camino.
 */
export function ResultadoReporte({ reporte, onAbrirFila, onExportar, sinExportacion, exportando }: Props) {
  const ejes = ejesDelGrafico(reporte.columnas);
  const esGrafico = reporte.visualizacion === 'barras' || reporte.visualizacion === 'torta';
  const datos: PuntoGrafico[] = ejes
    ? reporte.filas.map((fila) => ({
        etiqueta: formatearValor(fila[ejes.etiqueta.clave], ejes.etiqueta.tipo),
        valor: Number(fila[ejes.valor.clave] ?? 0),
      }))
    : [];

  return (
    <View style={styles.bloque}>
      <View style={styles.encabezado}>
        <View style={styles.filaExito}>
          <Icono nombre="checkmark-circle" tamano={18} color={colores.accion} />
          <Text style={styles.exito}>Reporte generado</Text>
        </View>
        <Text style={styles.subtitulo}>{reporte.titulo}</Text>
        <Text style={styles.meta}>
          {reporte.entidad_etiqueta} · {reporte.total}{' '}
          {reporte.total === 1 ? 'resultado' : 'resultados'}
        </Text>
      </View>

      {reporte.filtros_aplicados.length > 0 ? (
        <View style={styles.filtros}>
          {reporte.filtros_aplicados.map((filtro) => (
            <Text key={filtro} style={styles.filtro}>
              {filtro}
            </Text>
          ))}
        </View>
      ) : null}

      {reporte.avisos.map((aviso) => (
        <Text key={aviso} style={styles.aviso}>
          {aviso}
        </Text>
      ))}

      <View style={styles.resultado}>
        {reporte.total === 0 ? (
          <Text style={styles.nota}>No hay datos que cumplan esas condiciones todavía.</Text>
        ) : reporte.visualizacion === 'resumen' ? (
          <ResumenReporte columnas={reporte.columnas} filas={reporte.filas} />
        ) : esGrafico && ejes ? (
          reporte.visualizacion === 'barras' ? (
            <GraficoBarras datos={datos} tituloValor={ejes.valor.etiqueta} />
          ) : (
            <GraficoProporciones datos={datos} tituloValor={ejes.valor.etiqueta} />
          )
        ) : (
          <TablaReporte
            columnas={reporte.columnas}
            filas={reporte.filas}
            onAbrir={reporte.ruta_detalle && onAbrirFila ? onAbrirFila : undefined}
          />
        )}
      </View>

      {reporte.ruta_detalle && onAbrirFila && reporte.total > 0 ? (
        <Text style={styles.pista}>Tocá una fila para abrir el detalle.</Text>
      ) : null}

      {sinExportacion ? null : <View style={styles.exportacion}>
        <Text style={styles.etiquetaExportar}>Exportar:</Text>
        {FORMATOS.map(({ formato, etiqueta }) => {
          // El formato que el usuario nombro en su frase queda marcado.
          const pedido = reporte.exportacion === formato;
          const ocupado = exportando === formato;
          return (
            <Pressable
              key={formato}
              onPress={() => onExportar(formato)}
              disabled={exportando !== null}
              style={[styles.botonFormato, pedido && styles.botonFormatoPedido]}
            >
              <Text style={[styles.textoFormato, pedido && styles.textoFormatoPedido]}>
                {ocupado ? 'Generando...' : etiqueta}
              </Text>
            </Pressable>
          );
        })}
      </View>}
      {!descargaDisponible && !sinExportacion ? (
        <Text style={styles.pista}>
          La descarga de archivos funciona en la versión web.
        </Text>
      ) : null}

      <View style={styles.pie}>
        <Text style={styles.tiempos}>
          {reporte.interpretacion_ms > 0
            ? `Interpretación ${(reporte.interpretacion_ms / 1000).toFixed(1)} s · `
            : ''}
          consulta {reporte.consulta_ms} ms
        </Text>
        {Platform.OS === 'web' && reporte.total > 0 ? (
          <Pressable onPress={() => descargarCsv(reporte)}>
            <Text style={styles.enlace}>Exportar CSV</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

/** Descarga en el navegador con los datos que ya estan en pantalla; no vuelve a consultar. */
function descargarCsv(reporte: ReporteResultado) {
  const documento = (globalThis as any).document;
  const url = (globalThis as any).URL;
  if (!documento || !url) return;
  // El BOM hace que Excel abra los acentos bien.
  const blob = new Blob(['﻿', aCsv(reporte)], { type: 'text/csv;charset=utf-8;' });
  const enlace = documento.createElement('a');
  enlace.href = url.createObjectURL(blob);
  const nombre = reporte.titulo.replace(/[^\w\s-]/g, '').trim();
  enlace.download = (nombre || 'reporte') + '.csv';
  enlace.click();
  url.revokeObjectURL(enlace.href);
}

const styles = StyleSheet.create({
  bloque: {
    width: '100%',
    backgroundColor: colores.superficie,
    borderWidth: 1,
    borderColor: colores.linea,
    borderRadius: radios.l,
    padding: espaciado.l,
    marginTop: espaciado.xl,
  },
  encabezado: { marginBottom: espaciado.s },
  filaExito: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  exito: {
    fontFamily: tipografia.familias.cuerpoFuerte,
    fontSize: tipografia.escala.nota,
    color: colores.accion,
  },
  subtitulo: {
    fontFamily: tipografia.familias.cuerpoFuerte,
    fontSize: tipografia.escala.subtitulo,
    color: colores.tinta,
    marginBottom: espaciado.xs,
  },
  meta: {
    fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.escala.nota,
    color: colores.tintaSuave,
    marginBottom: espaciado.s,
  },
  nota: {
    fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.escala.nota,
    color: colores.tintaSuave,
    lineHeight: 20,
  },
  filtros: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: espaciado.xs,
    marginBottom: espaciado.s,
  },
  filtro: {
    fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.escala.nota,
    color: colores.tinta,
    backgroundColor: colores.papel,
    borderWidth: 1,
    borderColor: colores.linea,
    borderRadius: radios.round,
    paddingVertical: espaciado.xs,
    paddingHorizontal: espaciado.s,
  },
  aviso: {
    fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.escala.nota,
    color: colores.areas.obligaciones,
    marginBottom: espaciado.xs,
  },
  resultado: { marginTop: espaciado.m },
  pista: {
    fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.escala.nota,
    color: colores.tintaSuave,
    marginTop: espaciado.s,
  },
  exportacion: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: espaciado.s,
    marginTop: espaciado.m,
  },
  etiquetaExportar: {
    fontFamily: tipografia.familias.cuerpoFuerte,
    fontSize: tipografia.escala.nota,
    color: colores.tintaSuave,
  },
  botonFormato: {
    minHeight: 44,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colores.linea,
    borderRadius: radios.m,
    paddingHorizontal: espaciado.l,
    backgroundColor: colores.papel,
  },
  botonFormatoPedido: { backgroundColor: colores.accion, borderColor: colores.accion },
  textoFormato: {
    fontFamily: tipografia.familias.cuerpoFuerte,
    fontSize: tipografia.escala.cuerpo,
    color: colores.tinta,
  },
  textoFormatoPedido: { color: colores.accionTexto },
  pie: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: espaciado.m,
    borderTopWidth: 1,
    borderTopColor: colores.linea,
    paddingTop: espaciado.s,
    gap: espaciado.m,
  },
  tiempos: {
    fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.escala.nota,
    color: colores.tintaSuave,
  },
  enlace: {
    fontFamily: tipografia.familias.cuerpoFuerte,
    fontSize: tipografia.escala.nota,
    color: colores.accion,
  },
});
