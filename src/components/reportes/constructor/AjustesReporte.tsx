import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Acordeon } from './Acordeon';
import { Desplegable } from './Desplegable';
import { NOMBRES_TIPO } from './SelectorCampos';
import { useConstructor } from '../../../controllers/reportes/useConstructor';
import { useAyuda } from '../../../controllers/ayuda/AyudaContext';
import { Catalogo, Operador, etiquetaDe } from '../../../models/reportes';
import { colores, espaciado, radios, tipografia } from '../../../theme';

interface Props {
  catalogo: Catalogo;
  constructor: ReturnType<typeof useConstructor>;
}

/** Los operadores en palabras; el codigo tecnico nunca llega a la pantalla. */
const NOMBRES_OPERADOR: Record<Operador, string> = {
  igual: 'Es igual a',
  distinto: 'Es distinto de',
  contiene: 'Contiene el texto',
  mayor_que: 'Es mayor que',
  menor_que: 'Es menor que',
  entre: 'Está entre',
  desde: 'Desde',
  hasta: 'Hasta',
};

type Panel = 'filtros' | 'agrupar' | 'calculos' | 'orden';

/**
 * Paso 3: lo que se puede ajustar, cerrado por defecto.
 *
 * Los cuatro ajustes son opcionales y la mayoria de los reportes no los necesita, asi
 * que empiezan plegados y cada tarjeta explica en una linea para que sirve. Quien solo
 * quiere una lista de datos nunca los abre.
 */
export function AjustesReporte({ catalogo, constructor: c }: Props) {
  const { abrirAyuda } = useAyuda();
  const [abierto, setAbierto] = useState<Panel | null>(null);
  const alternar = (panel: Panel) => setAbierto(abierto === panel ? null : panel);

  const campos = c.definicion?.campos ?? [];
  const filtrables = campos.filter((campo) => campo.filtrable);
  const agrupables = campos.filter((campo) => campo.agrupable);
  const agregables = campos.filter((campo) => campo.agregable);
  const ordenables = campos.filter((campo) => campo.ordenable);
  const orden = c.orden[0];

  return (
    <View>
      <Acordeon
        icono="filter-outline"
        onAyuda={() => abrirAyuda({ elemento: 'filtrar' })}
        titulo="Filtrar"
        descripcion="Mostrar solo los resultados que cumplan una condición."
        resumen={c.filtros.length ? `${c.filtros.length} activo${c.filtros.length > 1 ? 's' : ''}` : undefined}
        abierto={abierto === 'filtros'}
        onAlternar={() => alternar('filtros')}
      >
        {c.filtros.map((filtro, indice) => {
          const campo = filtrables.find((x) => x.clave === filtro.campo);
          return (
            <View key={indice} style={styles.bloqueFiltro}>
              <View style={styles.fila}>
                <Desplegable
                  etiqueta="Filtrar por"
                  valor={filtro.campo}
                  marcador="Elegí un dato"
                  opciones={filtrables.map((x) => ({
                    clave: x.clave,
                    etiqueta: x.etiqueta,
                    detalle: NOMBRES_TIPO[x.tipo] ?? x.tipo,
                  }))}
                  onElegir={(clave) => c.actualizarFiltro(indice, { campo: clave })}
                />
                {campo ? (
                  <Desplegable
                    etiqueta="Condición"
                    valor={filtro.operador}
                    opciones={campo.operadores.map((op) => ({
                      clave: op,
                      etiqueta: NOMBRES_OPERADOR[op],
                    }))}
                    onElegir={(op) =>
                      c.actualizarFiltro(indice, { operador: op as Operador })
                    }
                  />
                ) : null}
                {campo && campo.valores.length > 0 ? (
                  <Desplegable
                    etiqueta="Valor"
                    valor={filtro.valor}
                    marcador="Elegí un valor"
                    opciones={campo.valores.map((v) => ({ clave: v, etiqueta: v }))}
                    onElegir={(valor) => c.actualizarFiltro(indice, { valor })}
                  />
                ) : campo ? (
                  <View style={styles.campoTexto}>
                    <Text style={styles.etiquetaCampo}>Valor</Text>
                    <TextInput
                      style={styles.input}
                      value={filtro.valor}
                      onChangeText={(valor) => c.actualizarFiltro(indice, { valor })}
                      placeholder={campo.tipo === 'fecha' ? 'este mes, 2026-09, hoy' : 'Escribí el valor'}
                      placeholderTextColor={colores.tintaSuave}
                    />
                    {campo.tipo === 'fecha' ? (
                      <Text style={styles.ayuda}>
                        Podés escribir una fecha (2026-09-15) o una expresión como hoy,
                        este mes, últimos 30 días o septiembre 2026.
                      </Text>
                    ) : null}
                  </View>
                ) : null}
                {filtro.operador === 'entre' ? (
                  <View style={styles.campoTexto}>
                    <Text style={styles.etiquetaCampo}>Hasta</Text>
                    <TextInput
                      style={styles.input}
                      value={filtro.valor_hasta}
                      onChangeText={(valor_hasta) =>
                        c.actualizarFiltro(indice, { valor_hasta })
                      }
                      placeholder="Valor final"
                      placeholderTextColor={colores.tintaSuave}
                    />
                  </View>
                ) : null}
              </View>
              <Pressable
                onPress={() => c.quitarFiltro(indice)}
                style={styles.quitar}
                accessibilityRole="button"
                accessibilityLabel="Quitar este filtro"
              >
                <Text style={styles.quitarTexto}>Quitar filtro</Text>
              </Pressable>
            </View>
          );
        })}

        <Pressable
          onPress={() => c.agregarFiltro()}
          style={styles.agregar}
          accessibilityRole="button"
        >
          <Text style={styles.agregarTexto}>+ Agregar otro filtro</Text>
        </Pressable>

        {c.filtros.filter((f) => f.campo && f.valor).length > 0 ? (
          <View style={styles.activos}>
            <Text style={styles.activosTitulo}>Filtros activos</Text>
            {c.filtros
              .filter((f) => f.campo && f.valor)
              .map((f, i) => (
                <Text key={i} style={styles.etiquetaActiva}>
                  {etiquetaDe(c.definicion, f.campo)}{' '}
                  {NOMBRES_OPERADOR[f.operador].toLowerCase()} {f.valor}
                  {f.valor_hasta ? ' y ' + f.valor_hasta : ''}
                </Text>
              ))}
          </View>
        ) : null}
      </Acordeon>

      <Acordeon
        icono="layers-outline"
        onAyuda={() => abrirAyuda({ elemento: 'agrupar' })}
        titulo="Agrupar"
        descripcion="Juntar los registros que tengan algo en común."
        resumen={c.agrupacion.length ? etiquetaDe(c.definicion, c.agrupacion[0]) : undefined}
        abierto={abierto === 'agrupar'}
        onAlternar={() => alternar('agrupar')}
      >
        <Desplegable
          etiqueta="Agrupar por"
          valor={c.agrupacion[0] ?? ''}
          marcador="Sin agrupar"
          opciones={agrupables.map((x) => ({ clave: x.clave, etiqueta: x.etiqueta }))}
          onElegir={(clave) => {
            c.agrupacion.forEach((previa) => c.quitarAgrupacion(previa));
            c.agregarAgrupacion(clave);
          }}
        />
        {c.agrupacion.length > 0 ? (
          <>
            <Text style={styles.explicacion}>
              Vas a obtener un resultado por cada{' '}
              {etiquetaDe(c.definicion, c.agrupacion[0]).toLowerCase()}.
            </Text>
            <Pressable
              onPress={() => c.quitarAgrupacion(c.agrupacion[0])}
              style={styles.quitar}
              accessibilityRole="button"
            >
              <Text style={styles.quitarTexto}>Quitar agrupación</Text>
            </Pressable>
          </>
        ) : (
          <Text style={styles.explicacion}>
            Por ejemplo, agrupando por tipo obtenés una fila por cada tipo con su total.
          </Text>
        )}
      </Acordeon>

      <Acordeon
        icono="calculator-outline"
        onAyuda={() => abrirAyuda({ elemento: 'calculos' })}
        titulo="Cálculos"
        descripcion="Contar, sumar o sacar promedios, mínimos y máximos."
        resumen={c.agregaciones.length ? `${c.agregaciones.length}` : undefined}
        abierto={abierto === 'calculos'}
        onAlternar={() => alternar('calculos')}
      >
        {c.agregaciones.map((agregacion, indice) => (
          <View key={indice} style={styles.bloqueFiltro}>
            <View style={styles.fila}>
              <Desplegable
                etiqueta="¿Qué cálculo querés hacer?"
                valor={agregacion.funcion}
                opciones={catalogo.funciones.map((f) => ({
                  clave: f.clave,
                  etiqueta: f.clave === 'conteo' ? 'Contar registros' : f.etiqueta,
                }))}
                onElegir={(funcion) =>
                  c.actualizarAgregacion(indice, {
                    funcion: funcion as typeof agregacion.funcion,
                    // Contar no necesita un dato: cuenta filas.
                    campo: funcion === 'conteo' ? '' : agregacion.campo,
                  })
                }
              />
              {agregacion.funcion !== 'conteo' ? (
                <Desplegable
                  etiqueta="¿Sobre qué dato?"
                  valor={agregacion.campo}
                  marcador="Elegí un dato numérico"
                  opciones={agregables.map((x) => ({ clave: x.clave, etiqueta: x.etiqueta }))}
                  onElegir={(campo) => c.actualizarAgregacion(indice, { campo })}
                  ayuda="Solo aparecen los datos con los que se puede calcular."
                />
              ) : null}
            </View>
            <Pressable
              onPress={() => c.quitarAgregacion(indice)}
              style={styles.quitar}
              accessibilityRole="button"
            >
              <Text style={styles.quitarTexto}>Quitar cálculo</Text>
            </Pressable>
          </View>
        ))}
        <Pressable onPress={c.agregarAgregacion} style={styles.agregar} accessibilityRole="button">
          <Text style={styles.agregarTexto}>+ Agregar un cálculo</Text>
        </Pressable>
      </Acordeon>

      <Acordeon
        icono="swap-vertical-outline"
        onAyuda={() => abrirAyuda({ elemento: 'ordenar' })}
        titulo="Ordenar"
        descripcion="Elegir en qué orden aparecen los resultados."
        resumen={orden ? etiquetaDe(c.definicion, orden.campo) : undefined}
        abierto={abierto === 'orden'}
        onAlternar={() => alternar('orden')}
      >
        <View style={styles.fila}>
          <Desplegable
            etiqueta="Ordenar por"
            valor={orden?.campo ?? ''}
            marcador="Sin un orden particular"
            opciones={ordenables.map((x) => ({ clave: x.clave, etiqueta: x.etiqueta }))}
            onElegir={(clave) => c.ordenarPor(clave, orden?.direccion ?? 'desc')}
          />
          {orden ? (
            <Desplegable
              etiqueta="Orden"
              valor={orden.direccion}
              opciones={catalogo.direcciones.map((d) => ({
                clave: d.clave,
                etiqueta: d.clave === 'desc' ? 'Mayor a menor' : 'Menor a mayor',
              }))}
              onElegir={(direccion) =>
                c.ordenarPor(orden.campo, direccion as typeof orden.direccion)
              }
            />
          ) : null}
        </View>
        {orden ? (
          <Pressable onPress={c.quitarOrden} style={styles.quitar} accessibilityRole="button">
            <Text style={styles.quitarTexto}>Quitar orden</Text>
          </Pressable>
        ) : null}
      </Acordeon>

      {c.aviso ? <Text style={styles.alerta}>{c.aviso}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fila: { flexDirection: 'row', flexWrap: 'wrap', gap: espaciado.m },
  bloqueFiltro: {
    borderBottomWidth: 1,
    borderBottomColor: colores.linea,
    paddingBottom: espaciado.m,
    marginBottom: espaciado.m,
  },
  campoTexto: { minWidth: 220, flexGrow: 1, flexShrink: 1, marginBottom: espaciado.s },
  etiquetaCampo: {
    fontFamily: tipografia.familias.cuerpoFuerte,
    fontSize: tipografia.escala.nota,
    color: colores.tintaSuave,
    marginBottom: 6,
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colores.linea,
    borderRadius: radios.m,
    paddingHorizontal: espaciado.m,
    fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.escala.cuerpo,
    color: colores.tinta,
    backgroundColor: colores.superficie,
  },
  ayuda: {
    fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.escala.nota,
    color: colores.tintaSuave,
    lineHeight: 19,
    marginTop: 4,
  },
  explicacion: {
    fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.escala.nota,
    color: colores.tintaSuave,
    lineHeight: 20,
    marginTop: espaciado.xs,
  },
  agregar: {
    alignSelf: 'flex-start',
    minHeight: 44,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colores.accion,
    borderRadius: radios.m,
    paddingHorizontal: espaciado.m,
    marginTop: espaciado.xs,
  },
  agregarTexto: {
    fontFamily: tipografia.familias.cuerpoFuerte,
    fontSize: tipografia.escala.nota,
    color: colores.accion,
  },
  quitar: { alignSelf: 'flex-start', minHeight: 40, justifyContent: 'center' },
  quitarTexto: {
    fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.escala.nota,
    color: colores.alerta,
  },
  activos: { marginTop: espaciado.m },
  activosTitulo: {
    fontFamily: tipografia.familias.cuerpoFuerte,
    fontSize: tipografia.escala.nota,
    color: colores.tintaSuave,
    marginBottom: 6,
  },
  etiquetaActiva: {
    fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.escala.nota,
    color: colores.tinta,
    backgroundColor: colores.papel,
    borderWidth: 1,
    borderColor: colores.linea,
    borderRadius: radios.round,
    paddingVertical: 6,
    paddingHorizontal: espaciado.m,
    marginBottom: 4,
    alignSelf: 'flex-start',
  },
  alerta: {
    fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.escala.nota,
    color: colores.alerta,
    marginTop: espaciado.s,
  },
});
