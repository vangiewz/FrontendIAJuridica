import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { useLlamada } from '../../controllers/consultas/useLlamada';
import { ContenidoPanel } from '../../models/llamada';
import { ContenidoArchivo } from './ContenidoArchivo';
import { ContenidoArticulo } from './ContenidoArticulo';
import { ContenidoBorrador } from './ContenidoBorrador';
import { ContenidoClausula } from './ContenidoClausula';
import { ContenidoEscaneo } from './ContenidoEscaneo';
import { ContenidoTextoOcr } from './ContenidoTextoOcr';
import { ContenidoComparacion } from './ContenidoComparacion';
import { ContenidoDocumento } from './ContenidoDocumento';
import { ContenidoError } from './ContenidoError';
import { ContenidoRecibido } from './ContenidoRecibido';
import { ContenidoRecordatorio } from './ContenidoRecordatorio';
import { ContenidoRecordatorios } from './ContenidoRecordatorios';
import { ContenidoGenerado } from './ContenidoGenerado';
import { ContenidoReporte } from './ContenidoReporte';
import { ContenidoRespuesta } from './ContenidoRespuesta';
import { nombreTipoGenerado } from '../../services/llamada/resumenVoz';
import { colores, espaciado, tipografia } from '../../theme';

type Llamada = ReturnType<typeof useLlamada>;

/** El título del encabezado del panel para lo que se está mostrando. */
export function tituloDePanel(contenido: ContenidoPanel | null, llamada: Llamada): string {
  if (!contenido) return '';
  switch (contenido.tipo) {
    case 'respuesta': return 'Respuesta y fuentes';
    case 'articulo': return `Artículo ${contenido.numero}`;
    case 'archivo': return contenido.para === 'documento' ? 'Selecciona un documento' : 'Comparar documentos';
    case 'documento': return llamada.acciones.ficha ? 'Documento activo' : 'Documento';
    case 'comparacion': return 'Comparación';
    case 'borrador': return 'Documento en preparación';
    case 'documento_generado':
      return llamada.acciones.generado
        ? `Borrador de ${nombreTipoGenerado(llamada.acciones.generado.tipo_documento)}` : 'Documento generado';
    case 'reporte': return llamada.acciones.reporte?.titulo ?? 'Reporte';
    case 'escaneo': return 'Escaneo';
    case 'texto_ocr': return 'Texto reconocido';
    case 'clausula': return 'Cláusula fotografiada';
    case 'recordatorio': return 'Recordatorio';
    case 'recordatorios': return 'Recordatorios';
    case 'recibido':
      return llamada.acciones.recibidos.recibidos.length + llamada.acciones.recibidos.fallidos.length > 1 ? 'Archivos recibidos' : 'Archivo recibido';
    case 'error': return 'No pude completarlo';
  }
}

/**
 * Elige QUÉ dibuja el panel. Todo lo que muestra sale del controlador de la llamada
 * (`useLlamada`), que es quien guarda los datos: este componente no guarda nada, así que
 * cerrar o cambiar el panel no destruye la respuesta, el análisis ni ningún resultado.
 * Nada de lo que hay aquí llama a la voz; y nada navega fuera de la llamada.
 */
export function ContenidoPanelLlamada({ contenido, llamada }: { contenido: ContenidoPanel; llamada: Llamada }) {
  const { panel, acciones } = llamada;
  const escaner = acciones.escaner;

  switch (contenido.tipo) {
    case 'respuesta':
      return llamada.consultaRespondida ? (
        <ContenidoRespuesta consulta={llamada.consultaRespondida} hayNueva={llamada.consultaNuevaEnCurso}
          alAbrirArticulo={(codigo, numero) => panel.apilar({ tipo: 'articulo', codigo, numero })} />
      ) : <Vacio texto="Todavía no hay una respuesta para mostrar." />;

    case 'articulo':
      return <ContenidoArticulo codigo={contenido.codigo} numero={contenido.numero}
        alCambiar={(numero) => panel.reemplazar({ tipo: 'articulo', codigo: contenido.codigo, numero })} />;

    case 'archivo':
      return (
        <ContenidoArchivo para={contenido.para} primero={acciones.seleccion?.a ?? null}
          operacion={acciones.operacion} aviso={acciones.aviso}
          alSubir={() => { void acciones.elegirArchivoNuevo(contenido.para); }}
          alEscanear={() => { void escaner.iniciar('documento', contenido.para); }}
          alElegir={(item) => { void acciones.elegirGuardado(contenido.para, item); }}
          alCancelar={() => { void acciones.cancelarComparacion(); }} />
      );

    case 'documento':
      return (
        <ContenidoDocumento ficha={acciones.ficha} analisis={acciones.analisis}
          alAnalizar={() => { void acciones.analizarActivo(); }}
          fechas={acciones.recordatorios.fechasDoc} plazosHabiles={acciones.recordatorios.habilesDoc}
          recordatoriosDisponibles={acciones.recordatorios.disponible}
          alCrearRecordatorio={acciones.recordatorios.crearDesdeFecha}
          alCambiar={() => acciones.abrirSelector('documento')}
          alCerrarDocumento={() => { void acciones.cerrarDocumento(); }} />
      );

    case 'comparacion':
      return acciones.comparacion
        ? <ContenidoComparacion comparacion={acciones.comparacion} />
        : <Vacio texto="Todavía no hay una comparación." />;

    case 'borrador':
      return acciones.borrador
        ? <ContenidoBorrador borrador={acciones.borrador} alCancelar={() => { void acciones.cancelarGeneracion(); }} />
        : <Vacio texto="No hay un documento en preparación." />;

    case 'documento_generado':
      return acciones.generado ? (
        <ContenidoGenerado documento={acciones.generado} exportando={acciones.exportando} aviso={acciones.aviso}
          alExportar={(formato) => { void acciones.exportarBorradorGenerado(formato); }} salida={acciones.salida} />
      ) : <Vacio texto="Todavía no hay un documento generado." />;

    case 'reporte':
      return acciones.reporte ? (
        <ContenidoReporte reporte={acciones.reporte} exportando={acciones.exportando} aviso={acciones.aviso}
          alExportar={(formato) => { void acciones.exportarReporteActual(formato); }} salida={acciones.salida} />
      ) : <Vacio texto="Todavía no hay un reporte." />;

    case 'escaneo':
      return (
        <ContenidoEscaneo paginas={escaner.paginas} destino={escaner.destino} operacion={acciones.operacion}
          alVerTexto={() => panel.apilar({ tipo: 'texto_ocr' })}
          alAnalizar={() => { void escaner.analizar(); }}
          alRepetirPagina={(id) => { escaner.repetir(id); void escaner.editarPaginas(); }}
          alEditar={() => { void escaner.editarPaginas(); }}
          alRepetirEscaneo={() => { void escaner.repetirEscaneo(); }}
          alCancelar={escaner.cancelar} />
      );

    case 'texto_ocr':
      return <ContenidoTextoOcr paginas={escaner.paginas} />;

    case 'clausula':
      return (
        <ContenidoClausula pagina={escaner.paginas[0] ?? null} texto={escaner.clausula?.texto ?? null}
          operacion={acciones.operacion}
          alPreguntar={() => { void escaner.preguntarSobreClausula(); }}
          alConvertir={() => { void escaner.convertirClausulaEnDocumento(); }}
          alRepetir={() => { void escaner.repetirEscaneo(); }}
          alQuitar={escaner.quitarClausula} />
      );

    case 'recibido':
      return (
        <ContenidoRecibido recibidos={acciones.recibidos.recibidos} fallidos={acciones.recibidos.fallidos}
          operacion={acciones.operacion}
          alAnalizar={(id) => { void acciones.recibidos.analizar(id); }}
          alDescartar={acciones.recibidos.descartar} />
      );

    case 'recordatorio':
      return <ContenidoRecordatorio r={acciones.recordatorios} />;

    case 'recordatorios':
      return <ContenidoRecordatorios r={acciones.recordatorios} />;

    case 'error':
      return (
        <ContenidoError mensaje={contenido.mensaje} puedeReintentar={contenido.puedeReintentar}
          alReintentar={() => { panel.cerrar(); acciones.reintentarOperacion(); }} alCerrar={panel.cerrar} />
      );
  }
}

function Vacio({ texto }: { texto: string }) {
  return <View style={styles.vacio}><Text style={styles.texto}>{texto}</Text></View>;
}

const styles = StyleSheet.create({
  vacio: { padding: espaciado.m },
  texto: { fontFamily: tipografia.familias.cuerpo, fontSize: tipografia.escala.cuerpo, color: colores.tintaSuave },
});
