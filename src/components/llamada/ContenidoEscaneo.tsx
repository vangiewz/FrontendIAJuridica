import React from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Aviso } from '../shared/Aviso';
import { DestinoArchivo, Operacion } from '../../models/llamada';
import {
  armarTextoEscaneo, contarCaracteresUtiles, evaluarSuficiencia, PaginaEscaneada,
} from '../../services/escaner/escanerPuro';
import { colores, espaciado, radios, tipografia } from '../../theme';

interface Props {
  paginas: PaginaEscaneada[];
  destino: DestinoArchivo;
  /** Operación en curso (reconociendo, subiendo, analizando…): se ve su estado REAL. */
  operacion: Operacion | null;
  alVerTexto: () => void;
  alAnalizar: () => void;
  alRepetirPagina: (id: string) => void;
  alEditar: () => void;
  alRepetirEscaneo: () => void;
  alCancelar: () => void;
}

const ESTADO: Record<PaginaEscaneada['estado'], { texto: string; color: string }> = {
  pendiente: { texto: 'sin leer', color: colores.tintaSuave },
  ok: { texto: 'leída', color: colores.accion },
  vacia: { texto: 'sin texto', color: colores.destacado },
  error: { texto: 'error', color: colores.alerta },
};

/**
 * Vista previa del escaneo ANTES de analizarlo: las páginas, cuántos caracteres se
 * reconocieron y qué hacer. El texto es el que leyó el OCR, sin corregir: el análisis
 * jurídico es un paso aparte y solo empieza cuando el usuario lo pide.
 */
export function ContenidoEscaneo({
  paginas, destino, operacion, alVerTexto, alAnalizar, alRepetirPagina, alEditar, alRepetirEscaneo, alCancelar,
}: Props) {
  const ocupado = operacion !== null;
  const texto = armarTextoEscaneo(paginas);
  const { estado, caracteres } = evaluarSuficiencia(texto);
  const leidas = paginas.filter((p) => p.estado === 'ok').length;
  const problemas = paginas.filter((p) => p.estado === 'vacia' || p.estado === 'error');

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <Text style={styles.titulo}>{ocupado ? 'Procesando el escaneo' : 'Escaneo completado'}</Text>
      <Text style={styles.nota}>{`${paginas.length} ${paginas.length === 1 ? 'página' : 'páginas'}`}</Text>

      {ocupado ? (
        <View style={styles.progreso}>
          <ActivityIndicator color={colores.accion} />
          <Text style={styles.progresoTexto} accessibilityLiveRegion="polite">{operacion.texto}</Text>
        </View>
      ) : null}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tira}>
        {paginas.map((p, i) => (
          <View key={p.id} style={styles.pagina}>
            <Image source={{ uri: p.uri }} style={styles.miniatura} resizeMode="cover" />
            <Text style={styles.paginaNumero}>{`Pág. ${i + 1}`}</Text>
            <Text style={[styles.paginaEstado, { color: ESTADO[p.estado].color }]}>{ESTADO[p.estado].texto}</Text>
          </View>
        ))}
      </ScrollView>

      {!ocupado ? (
        <>
          <Text style={styles.nota}>
            {`Texto reconocido: ${caracteres.toLocaleString('es-BO')} caracteres en ${leidas} ${leidas === 1 ? 'página' : 'páginas'}.`}
          </Text>
          {estado === 'corto' ? (
            <Aviso tipo="error" mensaje="Es muy poco texto: el sistema necesita al menos 200 caracteres para analizarlo como documento. Agrega páginas o repite el escaneo." />
          ) : null}
          {estado === 'vacio' ? (
            <Aviso tipo="error" mensaje="No se reconoció texto. Repite el escaneo con buena luz y el documento bien enfocado." />
          ) : null}
          {problemas.map((p) => (
            <View key={p.id} style={styles.problema}>
              <Text style={styles.problemaTexto}>
                {`Página ${paginas.indexOf(p) + 1}: ${p.estado === 'error' ? (p.motivo ?? 'no se pudo leer') : 'no se detectó texto.'}`}
              </Text>
              <Pressable onPress={() => alRepetirPagina(p.id)} accessibilityRole="button" style={styles.enlace}>
                <Text style={styles.enlaceTexto}>Repetir página</Text>
              </Pressable>
            </View>
          ))}

          <Boton texto="Ver texto reconocido" onPress={alVerTexto} secundario deshabilitado={contarCaracteresUtiles(texto) === 0} />
          <Boton texto={destino === 'documento' ? 'Analizar documento' : 'Usar en la comparación'} onPress={alAnalizar}
            deshabilitado={estado !== 'ok'} />
          <View style={styles.fila}>
            <Boton texto="Editar páginas" onPress={alEditar} secundario compacto />
            <Boton texto="Repetir escaneo" onPress={alRepetirEscaneo} secundario compacto />
          </View>
          <Pressable onPress={alCancelar} accessibilityRole="button" style={styles.cancelar}>
            <Text style={styles.cancelarTexto}>Cancelar escaneo</Text>
          </Pressable>
        </>
      ) : null}
    </ScrollView>
  );
}

function Boton({ texto, onPress, secundario, compacto, deshabilitado }: {
  texto: string; onPress: () => void; secundario?: boolean; compacto?: boolean; deshabilitado?: boolean;
}) {
  return (
    <Pressable onPress={onPress} disabled={deshabilitado} accessibilityRole="button"
      style={[styles.boton, secundario && styles.botonSecundario, compacto && styles.botonCompacto, deshabilitado && styles.botonInactivo]}>
      <Text style={[styles.botonTexto, secundario && styles.botonTextoSecundario]}>{texto}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: espaciado.m, paddingBottom: espaciado.xl, gap: espaciado.s },
  titulo: { fontFamily: tipografia.familias.titulo, fontSize: tipografia.escala.subtitulo, color: colores.tinta },
  nota: { fontFamily: tipografia.familias.cuerpo, fontSize: tipografia.escala.nota, color: colores.tintaSuave, lineHeight: 20 },
  progreso: { flexDirection: 'row', alignItems: 'center', gap: espaciado.s, paddingVertical: espaciado.xs },
  progresoTexto: { flex: 1, fontFamily: tipografia.familias.cuerpoFuerte, fontSize: tipografia.escala.cuerpo, color: colores.tinta },
  tira: { gap: espaciado.s, paddingVertical: espaciado.xs },
  pagina: { width: 72, alignItems: 'center', gap: 2 },
  miniatura: { width: 72, height: 96, borderRadius: radios.s, borderWidth: 1, borderColor: colores.linea, backgroundColor: colores.papel },
  paginaNumero: { fontFamily: tipografia.familias.cuerpoFuerte, fontSize: 12, color: colores.tinta },
  paginaEstado: { fontFamily: tipografia.familias.cuerpo, fontSize: 12 },
  problema: { borderLeftWidth: 3, borderLeftColor: colores.destacado, paddingLeft: espaciado.s, gap: 2 },
  problemaTexto: { fontFamily: tipografia.familias.cuerpo, fontSize: tipografia.escala.nota, color: colores.tinta },
  enlace: { minHeight: 40, justifyContent: 'center' },
  enlaceTexto: { fontFamily: tipografia.familias.cuerpoFuerte, fontSize: tipografia.escala.nota, color: colores.accion },
  fila: { flexDirection: 'row', gap: espaciado.s },
  boton: { minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: radios.m, backgroundColor: colores.accion, paddingHorizontal: espaciado.m },
  botonSecundario: { backgroundColor: colores.superficie, borderWidth: 1, borderColor: colores.accion },
  botonCompacto: { flex: 1 },
  botonInactivo: { opacity: 0.4 },
  botonTexto: { fontFamily: tipografia.familias.cuerpoFuerte, fontSize: tipografia.escala.cuerpo, color: colores.accionTexto },
  botonTextoSecundario: { color: colores.accion },
  cancelar: { alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center' },
  cancelarTexto: { fontFamily: tipografia.familias.cuerpoFuerte, fontSize: tipografia.escala.nota, color: colores.alerta },
});
