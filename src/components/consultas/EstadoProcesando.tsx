import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { colores, espaciado, radios, tipografia } from '../../theme';
import { pasoDeEtapa } from './etapas';

const PASOS = ['Buscar', 'Analizar', 'Redactar', 'Verificar'];

const formatearTiempo = (ms: number) => {
  const total = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
};

/**
 * La espera de la respuesta. Muestra lo que el servidor informa de verdad —la etapa— y
 * un reloj con el tiempo transcurrido. No hay porcentajes inventados: el modelo local
 * puede tardar uno o dos minutos y la pantalla lo dice.
 */
export function EstadoProcesando({ etapa, iniciadoEn, reconectando }: {
  etapa: string | null; iniciadoEn: number; reconectando: boolean;
}) {
  const [ahora, setAhora] = useState(Date.now());
  useEffect(() => {
    const reloj = setInterval(() => setAhora(Date.now()), 1000);
    return () => clearInterval(reloj);
  }, []);

  const paso = pasoDeEtapa(etapa);
  const titulo = reconectando
    ? 'Reconectando con el servidor…'
    : (etapa ?? 'Analizando tu consulta...').replace(/\.\.\.$/, '…');

  return (
    <View style={styles.raiz} accessibilityLiveRegion="polite">
      <View style={styles.fila}>
        <ActivityIndicator size="small" color={colores.accion} />
        <Text style={styles.titulo}>{titulo}</Text>
        <Text style={styles.tiempo}>{formatearTiempo(ahora - iniciadoEn)}</Text>
      </View>
      {paso >= 0 && !reconectando ? (
        <View style={styles.pasos}>
          {PASOS.map((nombre, i) => (
            <View key={nombre} style={styles.paso}>
              <View style={[styles.barra, i <= paso && styles.barraActiva]} />
              <Text style={[styles.pasoTexto, i === paso && styles.pasoTextoActivo]} numberOfLines={1}>
                {nombre}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
      <Text style={styles.nota}>
        {reconectando
          ? 'Se perdió el contacto con el servidor; sigo intentando. Tu consulta no se pierde.'
          : 'Puede tardar uno o dos minutos: el análisis se hace con IA local en el servidor.'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  raiz: { alignSelf: 'stretch', marginTop: espaciado.m, padding: espaciado.m,
    backgroundColor: colores.superficie, borderRadius: radios.m, borderWidth: 1,
    borderColor: colores.linea },
  fila: { flexDirection: 'row', alignItems: 'center', gap: espaciado.s },
  titulo: { flex: 1, color: colores.tinta, fontFamily: tipografia.familias.cuerpoFuerte,
    fontSize: tipografia.escala.nota },
  tiempo: { color: colores.tintaSuave, fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.escala.nota, fontVariant: ['tabular-nums'] },
  pasos: { flexDirection: 'row', gap: espaciado.xs, marginTop: espaciado.m },
  paso: { flex: 1, gap: 4 },
  barra: { height: 4, borderRadius: 2, backgroundColor: colores.linea },
  barraActiva: { backgroundColor: colores.accion },
  pasoTexto: { color: colores.tintaSuave, fontFamily: tipografia.familias.cuerpo, fontSize: 11 },
  pasoTextoActivo: { color: colores.tinta, fontFamily: tipografia.familias.cuerpoFuerte },
  nota: { marginTop: espaciado.s, color: colores.tintaSuave, fontFamily: tipografia.familias.cuerpo,
    fontSize: 12, lineHeight: 17 },
});
