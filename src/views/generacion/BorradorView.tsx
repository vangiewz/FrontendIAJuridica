import React, { useState } from 'react';
import {
  ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Boton } from '../../components/shared/Boton';
import { Aviso } from '../../components/shared/Aviso';
import { TextoConPendientes } from '../../components/generacion/TextoConPendientes';
import { useBorrador } from '../../controllers/generacion/useBorrador';
import { FORMATOS_BORRADOR } from '../../models/generacion';
import { descargaDisponible } from '../../services/descargas';
import { useVolver } from '../../controllers/navegacion/useVolver';
import { anchos, colores, espaciado, interlineado, radios, tipografia } from '../../theme';

interface Props {
  id: string;
}

/**
 * HU-15. Cada version es un recurso con su propio id y su propia URL, asi que pedir
 * un cambio apila una pantalla nueva y "Atras" devuelve la version anterior, que
 * sigue existiendo en el backend.
 */
export function BorradorView({ id }: Props) {
  const router = useRouter();
  const {
    documento, versiones, cargando, guardando, exportando, error, revisar, exportar,
  } = useBorrador(id);
  const volver = useVolver('/(app)/(tabs)/generar');
  const [instruccion, setInstruccion] = useState('');

  const pedirCambio = async () => {
    const texto = instruccion.trim();
    if (!texto) return;
    const nuevo = await revisar({ instruccion: texto });
    if (nuevo) {
      setInstruccion('');
      router.push(`/(app)/documento-generado?id=${nuevo}`);
    }
  };

  if (cargando || guardando) {
    return (
      <View style={styles.centro}>
        <ActivityIndicator size="large" color={colores.accion} />
        <Text style={styles.nota}>
          {guardando
            ? 'Redactando la nueva versión con el modelo local. Puede tardar cerca de un minuto.'
            : 'Cargando el borrador...'}
        </Text>
      </View>
    );
  }

  if (!documento) {
    return (
      <View style={styles.centro}>
        <Text style={styles.error}>{error ?? 'No se encontró el borrador'}</Text>
        <Boton titulo="Volver" onPress={volver} variante="secundario" />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <View style={styles.contenedor}>
        <Text style={styles.titulo}>Borrador — versión {documento.version}</Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {documento.campos_faltantes.length > 0 ? (
          <Aviso
            tipo="error"
            mensaje={`Faltan datos que el sistema no completa solo: ${documento.campos_faltantes.join(', ')}. Aparecen marcados en el texto.`}
          />
        ) : null}

        <Text style={styles.subtitulo}>Vista previa</Text>
        <TextoConPendientes contenido={documento.contenido} />

        <View style={styles.exportacion}>
          <Text style={styles.etiquetaExportar}>Descargar esta versión:</Text>
          {FORMATOS_BORRADOR.map(({ formato, etiqueta }) => (
            <Pressable
              key={formato}
              onPress={() => exportar(formato)}
              disabled={exportando !== null}
              style={styles.botonFormato}
            >
              <Text style={styles.textoFormato}>
                {exportando === formato ? 'Generando...' : etiqueta}
              </Text>
            </Pressable>
          ))}
        </View>
        {!descargaDisponible ? (
          <Text style={styles.nota}>
            La descarga de archivos funciona en la versión web.
          </Text>
        ) : null}

        <Text style={styles.subtitulo}>Pedir un cambio</Text>
        <Text style={styles.nota}>
          Por ejemplo: «Cambiar el plazo de 12 meses a 24 meses». Se guarda como una
          versión nueva y la anterior se conserva.
        </Text>
        <TextInput
          style={styles.input}
          value={instruccion}
          onChangeText={setInstruccion}
          placeholder="Cambiar el plazo de 12 meses a 24 meses"
          placeholderTextColor={colores.tintaSuave}
        />
        <Boton titulo="Guardar como nueva versión" onPress={pedirCambio} />

        {versiones.length > 1 ? (
          <View style={styles.versiones}>
            <Text style={styles.etiqueta}>Versiones guardadas</Text>
            {versiones.map((v) => (
              <Text key={v.id} style={styles.version}>
                v{v.version} — {new Date(v.creado_en).toLocaleString()}
                {v.id === documento.id ? ' (mostrando)' : ''}
              </Text>
            ))}
          </View>
        ) : null}

        <View style={styles.volver}>
          <Boton titulo="Volver" onPress={volver} variante="secundario" />
        </View>
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
    marginBottom: espaciado.m,
  },
  subtitulo: {
    fontFamily: tipografia.familias.cuerpoFuerte,
    fontSize: tipografia.escala.subtitulo,
    color: colores.tinta,
    marginTop: espaciado.l,
    marginBottom: espaciado.s,
  },
  nota: {
    fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.escala.nota,
    color: colores.tintaSuave,
    lineHeight: 20,
    marginBottom: espaciado.m,
    textAlign: 'center',
  },
  error: {
    fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.escala.nota,
    color: colores.alerta,
    marginBottom: espaciado.m,
  },
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
    backgroundColor: colores.superficie,
    marginBottom: espaciado.m,
  },
  documento: {
    fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.escala.nota,
    color: colores.tinta,
    lineHeight: interlineado.cuerpo,
    backgroundColor: colores.superficie,
    borderWidth: 1,
    borderColor: colores.linea,
    borderRadius: radios.s,
    padding: espaciado.m,
    marginTop: espaciado.m,
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
    borderWidth: 1,
    borderColor: colores.linea,
    borderRadius: radios.s,
    paddingVertical: espaciado.xs,
    paddingHorizontal: espaciado.m,
    backgroundColor: colores.superficie,
  },
  textoFormato: {
    fontFamily: tipografia.familias.cuerpoFuerte,
    fontSize: tipografia.escala.nota,
    color: colores.tinta,
  },
  versiones: { marginTop: espaciado.l },
  version: {
    fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.escala.nota,
    color: colores.tintaSuave,
    marginTop: espaciado.xs,
  },
  volver: { marginTop: espaciado.xl },
});
