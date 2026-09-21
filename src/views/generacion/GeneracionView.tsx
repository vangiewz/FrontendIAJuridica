import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Boton } from '../../components/shared/Boton';
import { Icono } from '../../components/shared/Icono';
import { useAyuda } from '../../controllers/ayuda/AyudaContext';
import { TipoDocumentoAyuda } from '../../models/ayuda';
import { ResumenInterpretacion } from '../../components/generacion/ResumenInterpretacion';
import { useGeneracion } from '../../controllers/generacion/useGeneracion';
import {
  ConflictoDato, InterpretacionResponse, Plantilla, ProblemaCampo,
} from '../../models/generacion';
import { anchos, colores, espaciado, radios, tipografia } from '../../theme';

/** Gris oscuro: se ve como guía, sin parecerse al texto que escribió el usuario. */
const COLOR_EJEMPLO = '#7D786F';

const EJEMPLO_PROMPT =
  'Ejemplo: Generame un contrato de préstamo entre Juan Pérez CI 1234567 y María Gómez ' +
  'CI 7654321 por Bs 20.000, a 12 meses, con interés del 2% mensual.';

/**
 * HU-14. Dos caminos hacia el mismo formulario: describirlo en una frase o llenarlo a
 * mano. El formulario sale de la plantilla del backend, no de una lista escrita aca.
 *
 * La IA solo rellena campos: lo que escribe se puede corregir, y lo que el usuario ya
 * cargo no se pisa sin que lo decida. Lo que no se dijo queda pendiente y aparece
 * marcado en el borrador, nunca inventado.
 *
 * El borrador resultante no se muestra aqui: vive en su propia ruta por id, para que
 * se pueda recargar, compartir y para que Atras se comporte como en el resto de la app.
 */
export function GeneracionView() {
  const router = useRouter();
  const { abrirAyuda, catalogo: catalogoAyuda, establecerTipoDocumento } = useAyuda();
  const {
    plantillas, cargando, interpretando, error, problemas, interpretar, generar, setProblemas, quitarProblema,
  } = useGeneracion();
  const scroll = useRef<ScrollView>(null);
  const [tipo, setTipo] = useState<string | null>(null);
  const [datos, setDatos] = useState<Record<string, string>>({});
  const [prompt, setPrompt] = useState('');
  const [textoExtra, setTextoExtra] = useState('');
  const [interpretacion, setInterpretacion] = useState<InterpretacionResponse | null>(null);
  const [conflictos, setConflictos] = useState<ConflictoDato[]>([]);

  const plantilla: Plantilla | undefined = plantillas.find((p) => p.tipo_documento === tipo);
  useEffect(() => {
    establecerTipoDocumento(tipo as TipoDocumentoAyuda | null);
  }, [tipo, establecerTipoDocumento]);

  const aplicar = (respuesta: InterpretacionResponse) => {
    // `datos` ya viene combinado del backend: lo que habia mas lo detectado sin conflicto.
    if (respuesta.tipo_documento) setTipo(respuesta.tipo_documento);
    setDatos(respuesta.datos);
    setInterpretacion(respuesta);
    setConflictos(respuesta.conflictos);
  };

  const interpretarPrompt = async () => {
    // Descripcion inicial: empieza un documento nuevo, sin arrastrar el anterior.
    const respuesta = await interpretar(prompt, null, {});
    if (respuesta) aplicar(respuesta);
  };

  const completarPorTexto = async () => {
    // Aqui si se acumula: el texto completa el formulario que ya esta en pantalla.
    const respuesta = await interpretar(textoExtra, tipo, datos);
    if (respuesta) {
      aplicar(respuesta);
      setTextoExtra('');
    }
  };

  const resolverConflicto = (conflicto: ConflictoDato, reemplazar: boolean) => {
    if (reemplazar) {
      setDatos((previos) => ({ ...previos, [conflicto.campo]: conflicto.valor_detectado }));
    }
    setConflictos((previos) => previos.filter((c) => c.campo !== conflicto.campo));
  };

  const elegirTipo = (nuevo: string) => {
    setTipo(nuevo);
    // Al cambiar de tipo se conserva solo lo que la plantilla nueva sabe recibir.
    const destino = plantillas.find((p) => p.tipo_documento === nuevo);
    const claves = new Set((destino?.campos ?? []).map((c) => c.clave));
    setDatos((previos) =>
      Object.fromEntries(Object.entries(previos).filter(([clave]) => claves.has(clave))),
    );
    setInterpretacion(null);
    setConflictos([]);
    setProblemas([]);
  };

  const crear = async () => {
    if (!plantilla) return;
    const id = await generar(plantilla.tipo_documento, datos);
    if (id) { router.push(`/(app)/documento-generado?id=${id}`); return; }
    // Si falló, el mensaje y los campos a corregir están arriba: se lleva al usuario hasta ahí.
    scroll.current?.scrollTo({ y: 0, animated: true });
  };

  const problemaDe = (clave: string): ProblemaCampo | undefined => problemas.find((p) => p.clave === clave);
  const hayErrores = problemas.some((p) => p.nivel === 'error');

  // Los pendientes se recalculan sobre lo que hay en el formulario ahora mismo, no
  // sobre la respuesta de la IA: el usuario pudo escribir o borrar despues.
  const pendientes = (plantilla?.campos ?? [])
    .filter((campo) => !(datos[campo.clave] ?? '').trim())
    .map((campo) => ({
      clave: campo.clave,
      etiqueta: campo.etiqueta,
      obligatorio: campo.obligatorio,
    }));

  if (plantillas.length === 0 && !error) {
    return (
      <View style={styles.centro}>
        <ActivityIndicator size="large" color={colores.accion} />
      </View>
    );
  }

  return (
    <ScrollView ref={scroll} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
      <View style={styles.contenedor}>
        <Text style={styles.titulo}>Generar un documento</Text>
        <Text style={styles.nota}>
          Describí lo que necesitás o completá el formulario a mano. Solo se redactan los
          tipos de contrato dentro del alcance del sistema. Es un borrador de apoyo: debe
          revisarlo un profesional antes de usarlo.
        </Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {problemas.length > 0 ? (
          <View style={[styles.problemas, hayErrores ? styles.problemasError : styles.problemasAviso]}
            accessibilityLiveRegion="polite">
            <Text style={styles.problemasTitulo}>
              {hayErrores ? 'Corregí estos campos para poder generar' : 'Conviene revisar estos campos'}
            </Text>
            {problemas.map((p) => (
              <View key={p.clave} style={styles.problemaFila}>
                <Text style={styles.problemaEtiqueta}>{p.nivel === 'error' ? '✖' : '⚠'} {p.etiqueta}</Text>
                <Text style={styles.problemaTexto}>{p.mensaje}</Text>
                {p.ejemplo ? <Text style={styles.problemaEjemplo}>Ejemplo: {p.ejemplo}</Text> : null}
              </View>
            ))}
          </View>
        ) : null}

        <View style={styles.bloque}>
          <Text style={styles.subtitulo}>Describí el documento que querés generar</Text>
          <TextInput
            style={styles.campoGrande}
            value={prompt}
            onChangeText={setPrompt}
            multiline
            editable={!interpretando && !cargando}
            placeholder={EJEMPLO_PROMPT}
            placeholderTextColor={colores.tintaSuave}
          />
          <Boton
            titulo="INTERPRETAR DATOS"
            onPress={interpretarPrompt}
            cargando={interpretando}
          />
          {interpretando ? (
            <Text style={styles.nota}>Leyendo el texto con el modelo local...</Text>
          ) : null}
          {interpretacion?.mensaje ? (
            <Text style={styles.mensaje}>{interpretacion.mensaje}</Text>
          ) : null}
        </View>

        <Text style={styles.subtitulo}>Tipo de documento</Text>
        <View style={styles.tipos}>
          {plantillas.map((p) => (
            <Pressable
              key={p.tipo_documento}
              onPress={() => elegirTipo(p.tipo_documento)}
              style={[styles.tipo, tipo === p.tipo_documento && styles.tipoActivo]}
            >
              <Text
                style={[styles.tipoTexto, tipo === p.tipo_documento && styles.tipoTextoActivo]}
              >
                {p.titulo}
              </Text>
            </Pressable>
          ))}
        </View>

        {plantilla ? (
          <>
            {interpretacion || conflictos.length > 0 ? (
              <View style={styles.bloque}>
                <ResumenInterpretacion
                  detectados={interpretacion?.detectados ?? []}
                  pendientes={pendientes}
                  conflictos={conflictos}
                  descartados={interpretacion?.descartados ?? []}
                  onResolver={resolverConflicto}
                />
              </View>
            ) : null}

            <View style={styles.bloque}>
              <Text style={styles.subtitulo}>Datos del documento</Text>
              <Text style={styles.nota}>
                Todos los campos son editables. Lo que dejes vacío queda marcado como
                pendiente en el borrador; el sistema no lo completa por su cuenta.
              </Text>
              {plantilla.campos.map((campo) => {
                const valor = datos[campo.clave] ?? '';
                const vacio = !valor.trim();
                const problema = problemaDe(campo.clave);
                return (
                  <View key={campo.clave} style={styles.campo}>
                    <View style={styles.etiquetaFila}>
                    <Text style={styles.etiqueta}>
                      {campo.etiqueta}
                      {campo.obligatorio ? '' : ' (opcional)'}
                    </Text>
                    {catalogoAyuda?.campos[campo.clave]?.destacado ? (
                      <Pressable onPress={() => abrirAyuda({ elemento: campo.clave })}
                        style={styles.ayudaCampo} accessibilityRole="button"
                        accessibilityLabel={`Ayuda sobre ${campo.etiqueta}`}>
                        <Icono nombre="help-circle-outline" tamano={19} color={colores.accion} />
                      </Pressable>
                    ) : null}
                    </View>
                    <TextInput
                      style={[
                        styles.input,
                        vacio && campo.obligatorio && styles.inputPendiente,
                        problema?.nivel === 'aviso' && styles.inputAviso,
                        problema?.nivel === 'error' && styles.inputProblema,
                      ]}
                      value={valor}
                      onChangeText={(nuevo) => {
                        setDatos({ ...datos, [campo.clave]: nuevo });
                        if (problema) quitarProblema(campo.clave);
                      }}
                      // El ejemplo en gris le dice al usuario QUÉ escribir y CÓMO; desaparece al escribir.
                      placeholder={campo.ejemplo || (campo.obligatorio ? 'Pendiente' : 'Opcional')}
                      placeholderTextColor={COLOR_EJEMPLO}
                      accessibilityLabel={campo.etiqueta}
                      accessibilityHint={campo.ejemplo}
                    />
                    {problema ? (
                      <Text style={[styles.textoProblema, problema.nivel === 'aviso' && styles.textoAviso]}>
                        {problema.nivel === 'error' ? '✖' : '⚠'} {problema.mensaje}
                      </Text>
                    ) : null}
                  </View>
                );
              })}
            </View>

            <View style={styles.bloque}>
              <Text style={styles.subtitulo}>Completar datos mediante texto</Text>
              <Text style={styles.nota}>
                Escribí información adicional y se cargan los campos que falten. Por
                ejemplo: «El contrato empieza el 1 de octubre de 2026, el pago será cada
                día 5 y el inmueble se usará como vivienda».
              </Text>
              <TextInput
                style={styles.campoMediano}
                value={textoExtra}
                onChangeText={setTextoExtra}
                multiline
                editable={!interpretando && !cargando}
                placeholder="Escribí información adicional"
                placeholderTextColor={colores.tintaSuave}
              />
              <Boton
                titulo="COMPLETAR CAMPOS"
                variante="secundario"
                onPress={completarPorTexto}
                cargando={interpretando}
              />
            </View>

            {cargando ? (
              <Text style={styles.nota}>
                Redactando con el modelo local. Puede tardar cerca de un minuto.
              </Text>
            ) : null}
            <Boton titulo="GENERAR BORRADOR" onPress={crear} cargando={cargando} />
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
    maxWidth: anchos.lectura,
    width: '100%',
    alignSelf: 'center',
  },
  centro: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colores.papel,
    padding: espaciado.xl,
  },
  titulo: {
    fontFamily: tipografia.familias.titulo,
    fontSize: tipografia.escala.titulo,
    color: colores.tinta,
    marginBottom: espaciado.s,
  },
  subtitulo: {
    fontFamily: tipografia.familias.cuerpoFuerte,
    fontSize: tipografia.escala.subtitulo,
    color: colores.tinta,
    marginTop: espaciado.s,
    marginBottom: espaciado.s,
  },
  nota: {
    fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.escala.nota,
    color: colores.tintaSuave,
    lineHeight: 20,
    marginBottom: espaciado.m,
  },
  mensaje: {
    fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.escala.nota,
    color: colores.areas.obligaciones,
    lineHeight: 20,
    marginTop: espaciado.s,
  },
  error: {
    fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.escala.nota,
    color: colores.alerta,
    marginBottom: espaciado.m,
  },
  tipos: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: espaciado.s,
    marginBottom: espaciado.m,
  },
  tipo: {
    borderWidth: 1,
    borderColor: colores.linea,
    borderRadius: radios.round,
    paddingVertical: espaciado.s,
    paddingHorizontal: espaciado.m,
  },
  tipoActivo: { backgroundColor: colores.accion, borderColor: colores.accion },
  tipoTexto: {
    fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.escala.nota,
    color: colores.tinta,
  },
  tipoTextoActivo: { color: colores.accionTexto },
  bloque: {
    backgroundColor: colores.superficie,
    borderWidth: 1,
    borderColor: colores.linea,
    borderRadius: radios.m,
    padding: espaciado.l,
    marginBottom: espaciado.l,
  },
  campo: { marginBottom: espaciado.s },
  etiquetaFila: { flexDirection: 'row', alignItems: 'center', gap: espaciado.xs },
  ayudaCampo: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  etiqueta: {
    fontFamily: tipografia.familias.cuerpoFuerte,
    fontSize: tipografia.escala.nota,
    color: colores.tintaSuave,
    marginBottom: espaciado.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: colores.linea,
    borderRadius: radios.s,
    padding: espaciado.s,
    fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.escala.cuerpo,
    color: colores.tinta,
    backgroundColor: colores.papel,
    marginBottom: espaciado.s,
  },
  // Un obligatorio vacio se ve distinto: que falte es informacion, no un descuido oculto.
  inputPendiente: { borderColor: colores.destacado, borderStyle: 'dashed' },
  // Un campo con algo que hay que corregir (rojo) o revisar (naranja): el motivo va debajo.
  inputProblema: { borderColor: colores.alerta, borderWidth: 2 },
  inputAviso: { borderColor: colores.destacado, borderWidth: 2 },
  textoProblema: {
    fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.escala.nota,
    color: colores.alerta,
    lineHeight: 19,
    marginTop: -espaciado.xs,
    marginBottom: espaciado.s,
  },
  textoAviso: { color: '#8A5A00' },
  problemas: {
    borderWidth: 1,
    borderRadius: radios.m,
    padding: espaciado.m,
    marginBottom: espaciado.m,
    gap: espaciado.s,
  },
  problemasError: { borderColor: colores.alerta, backgroundColor: '#FDECEE' },
  problemasAviso: { borderColor: colores.destacado, backgroundColor: '#FFF6E5' },
  problemasTitulo: {
    fontFamily: tipografia.familias.cuerpoFuerte,
    fontSize: tipografia.escala.cuerpo,
    color: colores.tinta,
  },
  problemaFila: { gap: 2 },
  problemaEtiqueta: {
    fontFamily: tipografia.familias.cuerpoFuerte,
    fontSize: tipografia.escala.nota,
    color: colores.tinta,
  },
  problemaTexto: {
    fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.escala.nota,
    color: colores.tinta,
    lineHeight: 20,
  },
  problemaEjemplo: {
    fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.escala.nota,
    color: colores.tintaSuave,
    lineHeight: 20,
  },
  campoGrande: {
    borderWidth: 1,
    borderColor: colores.linea,
    borderRadius: radios.s,
    padding: espaciado.m,
    minHeight: 120,
    textAlignVertical: 'top',
    fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.escala.cuerpo,
    color: colores.tinta,
    backgroundColor: colores.papel,
    marginBottom: espaciado.m,
  },
  campoMediano: {
    borderWidth: 1,
    borderColor: colores.linea,
    borderRadius: radios.s,
    padding: espaciado.m,
    minHeight: 80,
    textAlignVertical: 'top',
    fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.escala.cuerpo,
    color: colores.tinta,
    backgroundColor: colores.papel,
    marginBottom: espaciado.m,
  },
});
