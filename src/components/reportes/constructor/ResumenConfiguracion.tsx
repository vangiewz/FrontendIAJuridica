import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useConstructor } from '../../../controllers/reportes/useConstructor';
import { Icono } from '../../shared/Icono';
import { etiquetaDe } from '../../../models/reportes';
import { colores, espaciado, radios, tipografia } from '../../../theme';

interface Props {
  constructor: ReturnType<typeof useConstructor>;
}

const NOMBRES_VISTA: Record<string, string> = {
  tabla: 'Tabla',
  barras: 'Gráfico de barras',
  torta: 'Gráfico circular',
  resumen: 'Resumen de cifras',
};

const NOMBRES_CALCULO: Record<string, string> = {
  conteo: 'Cantidad de registros',
  suma: 'Suma',
  promedio: 'Promedio',
  minimo: 'Mínimo',
  maximo: 'Máximo',
};

/**
 * Lo que se va a pedir, en castellano y antes de pedirlo.
 *
 * Es la ultima oportunidad de darse cuenta de que falta algo, asi que se lee como una
 * frase y no como una estructura. El JSON existe, pero vive en opciones avanzadas:
 * quien lo necesita sabe buscarlo y a quien no le sirve no le estorba.
 */
export function ResumenConfiguracion({ constructor: c }: Props) {
  const [verTecnico, setVerTecnico] = useState(false);
  if (!c.definicion) return null;

  const filtros = c.filtros.filter((f) => f.campo && f.valor);
  const orden = c.orden[0];

  return (
    <View style={styles.tarjeta}>
      <Text style={styles.titulo}>Tu reporte</Text>

      <Linea etiqueta="Datos" valor={c.definicion.etiqueta} />

      {c.agrupacion.length > 0 ? (
        <Linea
          etiqueta="Agrupado por"
          valor={c.agrupacion.map((k) => etiquetaDe(c.definicion, k)).join(', ')}
        />
      ) : null}

      {c.agregaciones.length > 0 ? (
        <Linea
          etiqueta="Cálculos"
          valor={c.agregaciones
            .map((a) =>
              a.campo
                ? `${NOMBRES_CALCULO[a.funcion]} de ${etiquetaDe(c.definicion, a.campo)}`
                : NOMBRES_CALCULO[a.funcion],
            )
            .join(', ')}
        />
      ) : null}

      {c.agrupacion.length === 0 ? (
        <View style={styles.bloque}>
          <Text style={styles.etiqueta}>Vas a mostrar</Text>
          {c.columnas.length === 0 ? (
            <Text style={styles.valorSuave}>
              Las columnas habituales de {c.definicion.etiqueta.toLowerCase()}
            </Text>
          ) : (
            c.columnas.map((clave) => (
              <Text key={clave} style={styles.item}>
                • {etiquetaDe(c.definicion, clave)}
              </Text>
            ))
          )}
        </View>
      ) : null}

      {filtros.map((filtro, indice) => (
        <Linea
          key={indice}
          etiqueta={indice === 0 ? 'Filtro' : ''}
          valor={`${etiquetaDe(c.definicion, filtro.campo)} = ${filtro.valor}${
            filtro.valor_hasta ? ' a ' + filtro.valor_hasta : ''
          }`}
        />
      ))}

      {orden ? (
        <Linea
          etiqueta="Orden"
          valor={`${etiquetaDe(c.definicion, orden.campo)}, ${
            orden.direccion === 'desc' ? 'mayor a menor' : 'menor a mayor'
          }`}
        />
      ) : null}

      <Linea etiqueta="Vista" valor={NOMBRES_VISTA[c.visualizacion] ?? c.visualizacion} />

      <Pressable
        onPress={() => setVerTecnico(!verTecnico)}
        style={styles.avanzadas}
        accessibilityRole="button"
        accessibilityState={{ expanded: verTecnico }}
      >
        <Icono nombre={verTecnico ? 'chevron-down' : 'chevron-forward'} tamano={16} />
        <Text style={styles.avanzadasTexto}>Opciones avanzadas</Text>
      </Pressable>
      {verTecnico ? (
        <>
          <Text style={styles.avanzadasAyuda}>
            Especificación técnica que se le envía al servidor.
          </Text>
          <Text style={styles.json}>{JSON.stringify(c.especificacion, null, 2)}</Text>
        </>
      ) : null}
    </View>
  );
}

function Linea({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <View style={styles.linea}>
      <Text style={styles.etiqueta}>{etiqueta}</Text>
      <Text style={styles.valor}>{valor}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tarjeta: {
    borderWidth: 1,
    borderColor: colores.linea,
    borderRadius: radios.l,
    backgroundColor: colores.superficie,
    padding: espaciado.l,
  },
  titulo: {
    fontFamily: tipografia.familias.cuerpoFuerte,
    fontSize: tipografia.escala.subtitulo,
    color: colores.tinta,
    marginBottom: espaciado.m,
  },
  linea: { flexDirection: 'row', flexWrap: 'wrap', gap: espaciado.s, marginBottom: 6 },
  etiqueta: {
    width: 110,
    fontFamily: tipografia.familias.cuerpoFuerte,
    fontSize: tipografia.escala.nota,
    color: colores.tintaSuave,
  },
  valor: {
    flex: 1,
    minWidth: 160,
    fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.escala.cuerpo,
    color: colores.tinta,
  },
  valorSuave: {
    fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.escala.cuerpo,
    color: colores.tintaSuave,
  },
  bloque: { marginBottom: 6 },
  item: {
    fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.escala.cuerpo,
    color: colores.tinta,
    marginTop: 2,
  },
  avanzadas: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: espaciado.m,
    minHeight: 40,
  },
  avanzadasTexto: {
    fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.escala.nota,
    color: colores.tintaSuave,
  },
  avanzadasAyuda: {
    fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.escala.nota,
    color: colores.tintaSuave,
    marginBottom: 6,
  },
  json: {
    fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.escala.nota,
    color: colores.tinta,
    backgroundColor: colores.papel,
    borderWidth: 1,
    borderColor: colores.linea,
    borderRadius: radios.m,
    padding: espaciado.m,
  },
});
