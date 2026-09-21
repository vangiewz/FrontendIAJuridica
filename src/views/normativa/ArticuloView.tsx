import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useArticulo } from '../../controllers/normativa/useArticulo';
import { EsqueletoLectura } from '../../components/normativa/EsqueletoLectura';
import { MigaJuridica } from '../../components/normativa/MigaJuridica';
import { ProcedenciaFuente } from '../../components/normativa/ProcedenciaFuente';
import { NavegacionArticulo } from '../../components/normativa/NavegacionArticulo';
import { ExplicacionSimple } from '../../components/normativa/ExplicacionSimple';
import { Aviso } from '../../components/shared/Aviso';
import { SelloVigencia } from '../../components/consultas/SelloVigencia';
import { colores, tipografia, espaciado, interlineado, anchos, radios } from '../../theme';
import { colorDeArea } from '../../theme/areas';
import { Boton } from '../../components/shared/Boton';
import { useVolver } from '../../controllers/navegacion/useVolver';
import { EnlaceVolver } from '../../components/shared/EnlaceVolver';
import { useConexion } from '../../controllers/conexion/useConexion';

interface Props {
  codigo: string;
  numero: number;
}

export function ArticuloView({ codigo, numero }: Props) {
  const volver = useVolver('/(app)/(tabs)/');
  const { articulo, cargando, error } = useArticulo(codigo, numero);
  const conexion = useConexion();

  if (cargando) {
    return (
      <View style={styles.pantalla}>
        <EsqueletoLectura />
      </View>
    );
  }

  if (error || !articulo) {
    return (
      <View style={styles.pantallaCentral}>
        <Text style={styles.textoError}>{error}</Text>
        <Boton titulo="Volver" onPress={volver} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.pantalla} contentContainerStyle={styles.scrollContent}>
      <View style={styles.columnaCentral}>
        <EnlaceVolver respaldo="/(app)/(tabs)/" />
        <MigaJuridica ubicacion={articulo.ubicacion} />
        
        <Text style={styles.rotuloArticulo}>Artículo</Text>
        <Text style={styles.numeral}>{articulo.numero_articulo}</Text>
        <Text style={styles.nombreCodigo}>{articulo.codigo}</Text>

        {articulo.epigrafe ? (
          <View style={styles.encabezadoBloque}>
            <Text style={styles.epigrafe}>{articulo.epigrafe}</Text>
            <SelloVigencia estado={articulo.estado_vigencia} />
          </View>
        ) : null}

        <Text style={styles.textoCompleto}>{articulo.texto}</Text>

        {conexion.estado === 'sin-red' || conexion.estado === 'servidor-caido' ? (
          <View style={[styles.bloqueExplicacion, { marginTop: espaciado.xl }]}>
            <Text style={styles.tituloExplicacion}>Explicación no disponible</Text>
            <Text style={styles.notaExplicacion}>La asistencia por inteligencia artificial requiere conexión con el servidor.</Text>
          </View>
        ) : (
          <ExplicacionSimple codigo={articulo.codigo} numero={articulo.numero_articulo} />
        )}

        <ProcedenciaFuente
          fuenteNombre={articulo.fuente_nombre}
          fuenteUrl={articulo.fuente_url}
          estado={articulo.estado_vigencia}
          nota={articulo.nota_vigencia}
        />

        <NavegacionArticulo
          codigo={articulo.codigo}
          anterior={articulo.anterior}
          siguiente={articulo.siguiente}
        />

        <View style={styles.margenAviso}>
          <Aviso mensaje="El sistema es una herramienta de apoyo y no sustituye el criterio profesional de un abogado. Toda respuesta jurídica debe ser verificada." />
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  pantalla: {
    flex: 1,
    backgroundColor: colores.papel,
  },
  pantallaCentral: {
    flex: 1,
    backgroundColor: colores.papel,
    alignItems: 'center',
    justifyContent: 'center',
    padding: espaciado.xl,
  },
  textoError: {
    fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.escala.cuerpo,
    color: colores.tinta,
    marginBottom: espaciado.l,
    textAlign: 'center',
  },
  scrollContent: {
    alignItems: 'center',
  },
  columnaCentral: {
    width: '100%',
    maxWidth: anchos.panel,
    padding: espaciado.xl,
  },
  rotuloArticulo: {
    fontFamily: tipografia.familias.cuerpoFuerte,
    fontSize: tipografia.escala.nota,
    color: colores.tintaSuave,
  },
  numeral: {
    fontFamily: tipografia.familias.titulo,
    fontSize: tipografia.escala.numeral,
    // El mismo interlineado que PasoNumerado: el digito se apoya exacto y no arrastra
    // el espacio de linea que agrega la fuente.
    lineHeight: tipografia.escala.numeral,
    color: colores.destacado,
    marginBottom: espaciado.xs,
  },
  nombreCodigo: {
    fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.escala.nota,
    color: colores.tintaSuave,
    marginBottom: espaciado.l,
  },
  encabezadoBloque: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    gap: espaciado.m,
    marginBottom: espaciado.l,
  },
  epigrafe: {
    fontFamily: tipografia.familias.titulo,
    fontSize: tipografia.escala.titulo,
    color: colores.tinta,
    flexShrink: 1,
  },
  textoCompleto: {
    fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.escala.cuerpo,
    lineHeight: interlineado.cuerpo,
    color: colores.tinta,
  },
  margenAviso: {
    marginTop: espaciado.xxl,
  },
  // Nota al margen de la cartilla: sin conexion no es un error, asi que va en el aviso
  // informativo del sistema (fondo `linea`, tinta) y nunca en rojo.
  bloqueExplicacion: {
    backgroundColor: colores.linea,
    borderRadius: radios.s,
    padding: espaciado.m,
  },
  tituloExplicacion: {
    fontFamily: tipografia.familias.cuerpoFuerte,
    fontSize: tipografia.escala.nota,
    color: colores.tinta,
  },
  notaExplicacion: {
    fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.escala.nota,
    color: colores.tintaSuave,
    marginTop: espaciado.xs,
  },
});
