import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Boton } from '../../components/shared/Boton';
import { Aviso } from '../../components/shared/Aviso';
import { useIngestaNormativa } from '../../controllers/administracion/useIngestaNormativa';
import { describirOrigen } from '../../models/administracion';
import { formatearTamano } from '../../models/documentos';
import { useSesion } from '../../controllers/auth/useSesion';
import { esAdministrador } from '../../models/auth';
import { anchos, colores, espaciado, radios, tipografia } from '../../theme';

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <View style={styles.dato}>
      <Text style={styles.datoEtiqueta}>{etiqueta}</Text>
      <Text style={styles.datoValor}>{valor}</Text>
    </View>
  );
}

export function IngestaNormativaView() {
  const { usuario } = useSesion();
  const {
    fuentes,
    fuenteElegida,
    archivo,
    reporte,
    cargandoFuentes,
    procesando,
    error,
    cargarFuentes,
    elegirFuente,
    seleccionarArchivo,
    quitarArchivo,
    procesar,
  } = useIngestaNormativa();

  useEffect(() => {
    if (esAdministrador(usuario)) cargarFuentes();
  }, [usuario]);

  // El backend rechaza igual a quien no sea administrador; esto solo evita
  // mostrar una pantalla que no va a poder usar.
  if (!esAdministrador(usuario)) {
    return (
      <View style={styles.centro}>
        <Text style={styles.sinPermiso}>
          Esta sección es solo para administradores jurídicos.
        </Text>
      </View>
    );
  }

  if (cargandoFuentes && fuentes.length === 0) {
    return (
      <View style={styles.centro}>
        <ActivityIndicator size="large" color={colores.accion} />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <View style={styles.contenedor}>
        <Text style={styles.titulo}>Administración de normativa</Text>
        <Text style={styles.introduccion}>
          Incorporá o actualizá una fuente jurídica. El sistema extrae los artículos, los organiza
          por libro y área, y versiona lo que haya cambiado.
        </Text>

        {error ? <Aviso mensaje={error} tipo="error" /> : null}

        <Text style={styles.rotulo}>FUENTE</Text>
        {fuentes.map((fuente) => {
          const elegida = fuente.clave === fuenteElegida;
          return (
            <TouchableOpacity
              key={fuente.clave}
              style={[styles.opcion, elegida && styles.opcionElegida]}
              activeOpacity={0.8}
              onPress={() => elegirFuente(fuente.clave)}
            >
              <Text style={[styles.opcionNombre, elegida && styles.opcionNombreElegida]}>
                {fuente.codigo}
              </Text>
              <Text style={styles.opcionMeta}>
                {fuente.total_esperado} artículos esperados · {fuente.fuente_nombre}
              </Text>
            </TouchableOpacity>
          );
        })}

        <Text style={styles.rotulo}>ARCHIVO</Text>
        {archivo ? (
          <View style={styles.archivo}>
            <Text style={styles.archivoNombre} numberOfLines={2}>{archivo.nombre}</Text>
            <Text style={styles.archivoMeta}>{formatearTamano(archivo.tamano) ?? 'PDF'}</Text>
          </View>
        ) : (
          <Text style={styles.ayuda}>
            Sin archivo se procesa el documento que ya viene incluido en el sistema.
          </Text>
        )}

        <View style={styles.acciones}>
          <Boton
            titulo={archivo ? 'Elegir otro PDF' : 'Seleccionar PDF'}
            onPress={seleccionarArchivo}
            variante="secundario"
          />
          {archivo ? (
            <Boton titulo="Quitar archivo" onPress={quitarArchivo} variante="secundario" />
          ) : null}
          <Boton
            titulo={procesando ? 'Procesando normativa...' : 'Procesar normativa'}
            onPress={procesar}
            cargando={procesando}
          />
        </View>

        {procesando ? (
          <Text style={styles.ayuda}>
            Puede tardar: se leen todos los artículos y se compara cada uno con el que ya estaba
            guardado.
          </Text>
        ) : null}

        {reporte ? (
          <View style={styles.resultado}>
            <Text style={styles.resultadoTitulo}>NORMATIVA PROCESADA</Text>
            <Dato etiqueta="Fuente" valor={reporte.codigo} />
            <Dato etiqueta="Origen del archivo" valor={describirOrigen(reporte.origen)} />
            <Dato etiqueta="Artículos procesados" valor={String(reporte.total_procesados)} />
            <Dato etiqueta="Nuevos" valor={String(reporte.insertadas)} />
            <Dato etiqueta="Actualizados (nueva versión)" valor={String(reporte.actualizadas)} />
            <Dato etiqueta="Sin cambios" valor={String(reporte.sin_cambios)} />

            <View style={styles.bloque}>
              <Text style={styles.bloqueTitulo}>Artículos por libro</Text>
              {Object.entries(reporte.por_libro).map(([libro, cantidad]) => (
                <Text key={libro} style={styles.linea}>
                  {libro}: {cantidad}
                </Text>
              ))}
            </View>

            <View style={styles.bloque}>
              <Text style={styles.bloqueTitulo}>Artículos por área jurídica</Text>
              {Object.entries(reporte.por_area).map(([area, cantidad]) => (
                <Text key={area} style={styles.linea}>
                  {area.replace('_', ' ')}: {cantidad}
                </Text>
              ))}
            </View>

            <Text style={styles.nota}>
              La normativa ya quedó disponible para las consultas y las citas de fuentes.
            </Text>
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    backgroundColor: colores.papel,
  },
  contenedor: {
    padding: espaciado.xl,
    maxWidth: anchos.panel,
    width: '100%',
    alignSelf: 'center',
    flex: 1,
  },
  centro: {
    flex: 1,
    backgroundColor: colores.papel,
    alignItems: 'center',
    justifyContent: 'center',
    padding: espaciado.xl,
  },
  sinPermiso: {
    fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.escala.cuerpo,
    color: colores.tintaSuave,
    textAlign: 'center',
    lineHeight: 24,
  },
  titulo: {
    fontFamily: tipografia.familias.titulo,
    fontSize: tipografia.escala.titulo,
    color: colores.tinta,
    marginBottom: espaciado.s,
  },
  introduccion: {
    fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.escala.cuerpo,
    color: colores.tinta,
    lineHeight: 24,
    marginBottom: espaciado.xl,
  },
  rotulo: {
    fontFamily: tipografia.familias.cuerpoFuerte,
    fontSize: tipografia.escala.nota,
    color: colores.tintaSuave,
    letterSpacing: 1,
    marginBottom: espaciado.s,
    marginTop: espaciado.m,
  },
  opcion: {
    borderWidth: 1,
    borderColor: colores.linea,
    borderRadius: radios.s,
    backgroundColor: colores.superficie,
    padding: espaciado.m,
    marginBottom: espaciado.s,
  },
  opcionElegida: {
    borderColor: colores.accion,
    borderWidth: 2,
  },
  opcionNombre: {
    fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.escala.cuerpo,
    color: colores.tinta,
  },
  opcionNombreElegida: {
    fontFamily: tipografia.familias.cuerpoFuerte,
    color: colores.accion,
  },
  opcionMeta: {
    fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.escala.nota,
    color: colores.tintaSuave,
    marginTop: espaciado.xs,
  },
  archivo: {
    borderWidth: 1,
    borderColor: colores.linea,
    borderRadius: radios.s,
    backgroundColor: colores.superficie,
    padding: espaciado.m,
    marginBottom: espaciado.s,
  },
  archivoNombre: {
    fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.escala.cuerpo,
    color: colores.tinta,
  },
  archivoMeta: {
    fontFamily: tipografia.familias.cuerpoFuerte,
    fontSize: tipografia.escala.nota,
    color: colores.accion,
    marginTop: espaciado.xs,
  },
  ayuda: {
    fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.escala.nota,
    color: colores.tintaSuave,
    lineHeight: 20,
    marginBottom: espaciado.s,
  },
  acciones: {
    gap: espaciado.m,
    marginTop: espaciado.l,
    marginBottom: espaciado.l,
  },
  resultado: {
    backgroundColor: colores.superficie,
    borderWidth: 1,
    borderColor: colores.accion,
    borderRadius: radios.m,
    padding: espaciado.l,
  },
  resultadoTitulo: {
    fontFamily: tipografia.familias.cuerpoFuerte,
    fontSize: tipografia.escala.nota,
    color: colores.accion,
    letterSpacing: 1,
    marginBottom: espaciado.l,
  },
  dato: {
    marginBottom: espaciado.m,
  },
  datoEtiqueta: {
    fontFamily: tipografia.familias.cuerpoFuerte,
    fontSize: tipografia.escala.nota,
    color: colores.tintaSuave,
    marginBottom: espaciado.xs,
  },
  datoValor: {
    fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.escala.cuerpo,
    color: colores.tinta,
  },
  bloque: {
    borderTopWidth: 1,
    borderTopColor: colores.linea,
    paddingTop: espaciado.m,
    marginBottom: espaciado.m,
  },
  bloqueTitulo: {
    fontFamily: tipografia.familias.titulo,
    fontSize: tipografia.escala.cuerpo,
    color: colores.tinta,
    marginBottom: espaciado.s,
  },
  linea: {
    fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.escala.nota,
    color: colores.tinta,
    marginBottom: espaciado.xs,
  },
  nota: {
    fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.escala.nota,
    color: colores.tintaSuave,
    lineHeight: 20,
    borderTopWidth: 1,
    borderTopColor: colores.linea,
    paddingTop: espaciado.m,
  },
});
