import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Boton } from '../../components/shared/Boton';
import { useAyuda } from '../../controllers/ayuda/AyudaContext';
import { ResultadoReporte } from '../../components/reportes/ResultadoReporte';
import { useCatalogo } from '../../controllers/reportes/useCatalogo';
import { useConstructor } from '../../controllers/reportes/useConstructor';
import { useReporte } from '../../controllers/reportes/useReporte';
import { anchos, colores, espaciado, radios, tipografia } from '../../theme';
import { ConstructorView } from './ConstructorView';

const EJEMPLOS = [
  'Mostrame mis contratos de préstamo',
  'Mostrame cuántos documentos tengo por tipo',
  'Mostrame mis riesgos agrupados por severidad',
  'Mostrame las consultas jurídicas de este mes agrupadas por área',
  'Mostrame mis contratos de préstamo y exportalo a Excel',
];

type Modo = 'ia' | 'visual';

const PESTANAS: { clave: Modo; etiqueta: string; detalle: string }[] = [
  { clave: 'ia', etiqueta: 'Generar con IA', detalle: 'Escribilo con tus palabras' },
  { clave: 'visual', etiqueta: 'Constructor visual', detalle: 'Armalo paso a paso' },
];

/**
 * Reportes dinamicos, con dos formas de armar el mismo reporte.
 *
 * Los dos modos terminan en la misma `ReporteEspecificacion`, la ejecuta el mismo motor
 * y el resultado se dibuja y se exporta con los mismos componentes. La pagina usa el
 * ancho completo porque el constructor lo necesita; el campo de texto del modo IA se
 * mantiene en ancho de lectura, que es como se lee comodo.
 */
export function ReportesView() {
  const { establecerModoReporte } = useAyuda();
  const router = useRouter();
  const { reporte, cargando, exportando, error, pedir, ejecutar, exportar } = useReporte();
  const { catalogo, error: errorCatalogo } = useCatalogo();
  const constructor = useConstructor(catalogo);
  const [modo, setModo] = useState<Modo>('ia');
  useEffect(() => { establecerModoReporte(modo); }, [modo, establecerModoReporte]);
  const [peticion, setPeticion] = useState('');
  const [ajuste, setAjuste] = useState('');

  const generar = async () => {
    if (await pedir(peticion, false)) setAjuste('');
  };

  const aplicarAjuste = async () => {
    if (await pedir(ajuste, true)) setAjuste('');
  };

  const abrirFila = (id: string) => {
    if (!reporte?.ruta_detalle) return;
    // Se apila sobre las pestanas, asi que Atras vuelve a este mismo reporte.
    router.push(`/(app)/${reporte.ruta_detalle}?id=${id}`);
  };

  const cambiarModo = (nuevo: Modo) => {
    // Al pasar al constructor se arrastra la especificacion del reporte en pantalla:
    // lo que se pidio con una frase queda listo para seguir ajustandolo a mano.
    if (nuevo === 'visual' && reporte?.especificacion.entidad) {
      constructor.cargarDesde(reporte.especificacion);
    }
    setModo(nuevo);
  };

  return (
    <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
      <View style={styles.contenedor}>
        <Text style={styles.titulo}>Reportes dinámicos</Text>

        <View style={styles.pestanas}>
          {PESTANAS.map(({ clave, etiqueta, detalle }) => {
            const activa = modo === clave;
            return (
              <Pressable
                key={clave}
                onPress={() => cambiarModo(clave)}
                style={[styles.pestana, activa && styles.pestanaActiva]}
                accessibilityRole="tab"
                accessibilityState={{ selected: activa }}
              >
                <Text style={[styles.pestanaTexto, activa && styles.pestanaTextoActivo]}>
                  {etiqueta}
                </Text>
                <Text style={[styles.pestanaDetalle, activa && styles.pestanaDetalleActivo]}>
                  {detalle}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {errorCatalogo ? <Text style={styles.error}>{errorCatalogo}</Text> : null}

        {modo === 'ia' ? (
          <View style={styles.lectura}>
            <Text style={styles.subtitulo}>Pedí el reporte en tus palabras</Text>
            <Text style={styles.ayuda}>
              Escribí qué querés ver y el sistema lo interpreta. Si preferís armarlo con
              opciones, usá el constructor visual.
            </Text>
            <TextInput
              style={styles.campo}
              value={peticion}
              onChangeText={setPeticion}
              multiline
              editable={!cargando}
              placeholder={
                'Ejemplo: Mostrame los contratos analizados este mes agrupados por tipo y ' +
                'cantidad de riesgos.'
              }
              placeholderTextColor={colores.tintaSuave}
            />
            <View style={styles.ejemplos}>
              {EJEMPLOS.map((ejemplo) => (
                <Pressable
                  key={ejemplo}
                  onPress={() => setPeticion(ejemplo)}
                  disabled={cargando}
                  style={styles.ejemplo}
                >
                  <Text style={styles.ejemploTexto}>{ejemplo}</Text>
                </Pressable>
              ))}
            </View>
            <Boton titulo="GENERAR REPORTE" onPress={generar} cargando={cargando} />
            {cargando ? (
              <View style={styles.cargando}>
                <ActivityIndicator color={colores.accion} />
                <Text style={styles.ayuda}>Interpretando solicitud...</Text>
              </View>
            ) : null}
          </View>
        ) : !catalogo ? (
          <View style={styles.cargando}>
            <ActivityIndicator size="large" color={colores.accion} />
            <Text style={styles.ayuda}>Cargando los datos disponibles...</Text>
          </View>
        ) : (
          <ConstructorView
            catalogo={catalogo}
            constructor={constructor}
            cargando={cargando}
            onGenerar={(especificacion) => ejecutar(especificacion)}
          />
        )}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {reporte && !cargando ? (
          <>
            <ResultadoReporte
              reporte={reporte}
              onAbrirFila={abrirFila}
              onExportar={exportar}
              exportando={exportando}
            />

            {modo === 'ia' ? (
              <View style={[styles.lectura, styles.bloqueAjuste]}>
                <Text style={styles.subtitulo}>Ajustá este reporte</Text>
                <Text style={styles.ayuda}>
                  Sobre el reporte de arriba: «agregá la cantidad de riesgos», «ordenalos
                  de mayor a menor», «mostralo como gráfico».
                </Text>
                <TextInput
                  style={styles.campoChico}
                  value={ajuste}
                  onChangeText={setAjuste}
                  placeholder="Ahora mostralo como gráfico de barras"
                  placeholderTextColor={colores.tintaSuave}
                />
                <Boton titulo="Aplicar ajuste" variante="secundario" onPress={aplicarAjuste} />
              </View>
            ) : null}
          </>
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, backgroundColor: colores.papel },
  contenedor: {
    padding: espaciado.xl,
    // La herramienta usa el monitor entero; el texto de adentro se acota aparte.
    maxWidth: anchos.herramienta,
    width: '100%',
    alignSelf: 'center',
  },
  lectura: { maxWidth: anchos.lectura, width: '100%' },
  titulo: {
    fontFamily: tipografia.familias.titulo,
    fontSize: tipografia.escala.pregunta,
    color: colores.tinta,
    marginBottom: espaciado.l,
  },
  subtitulo: {
    fontFamily: tipografia.familias.cuerpoFuerte,
    fontSize: tipografia.escala.subtitulo,
    color: colores.tinta,
    marginBottom: espaciado.xs,
  },
  pestanas: { flexDirection: 'row', flexWrap: 'wrap', gap: espaciado.m, marginBottom: espaciado.xl },
  pestana: {
    minWidth: 230,
    minHeight: 64,
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colores.linea,
    borderRadius: radios.l,
    paddingVertical: espaciado.s,
    paddingHorizontal: espaciado.l,
    backgroundColor: colores.superficie,
  },
  pestanaActiva: { backgroundColor: colores.accion, borderColor: colores.accion },
  pestanaTexto: {
    fontFamily: tipografia.familias.cuerpoFuerte,
    fontSize: tipografia.escala.cuerpo,
    color: colores.tinta,
  },
  pestanaTextoActivo: { color: colores.accionTexto },
  pestanaDetalle: {
    fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.escala.nota,
    color: colores.tintaSuave,
    marginTop: 2,
  },
  pestanaDetalleActivo: { color: colores.accionTexto },
  ayuda: {
    fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.escala.nota,
    color: colores.tintaSuave,
    lineHeight: 21,
    marginBottom: espaciado.m,
  },
  campo: {
    borderWidth: 1,
    borderColor: colores.linea,
    borderRadius: radios.m,
    padding: espaciado.m,
    minHeight: 120,
    textAlignVertical: 'top',
    fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.escala.cuerpo,
    color: colores.tinta,
    backgroundColor: colores.superficie,
    marginBottom: espaciado.m,
  },
  campoChico: {
    borderWidth: 1,
    borderColor: colores.linea,
    borderRadius: radios.m,
    padding: espaciado.m,
    minHeight: 48,
    fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.escala.cuerpo,
    color: colores.tinta,
    backgroundColor: colores.superficie,
    marginBottom: espaciado.m,
  },
  ejemplos: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: espaciado.s,
    marginBottom: espaciado.m,
  },
  ejemplo: {
    minHeight: 40,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colores.linea,
    borderRadius: radios.round,
    paddingHorizontal: espaciado.m,
    backgroundColor: colores.superficie,
  },
  ejemploTexto: {
    fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.escala.nota,
    color: colores.tintaSuave,
  },
  cargando: { alignItems: 'center', marginTop: espaciado.l, gap: espaciado.s },
  error: {
    fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.escala.cuerpo,
    color: colores.alerta,
    marginTop: espaciado.m,
    lineHeight: 22,
  },
  bloqueAjuste: {
    borderWidth: 1,
    borderColor: colores.linea,
    borderRadius: radios.l,
    backgroundColor: colores.superficie,
    padding: espaciado.l,
    marginTop: espaciado.l,
  },
});
