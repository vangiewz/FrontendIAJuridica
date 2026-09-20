import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Arrastrable } from '../arrastre/Arrastrable';
import { Icono } from '../../shared/Icono';
import { CampoCatalogo } from '../../../models/reportes';
import { colores, espaciado, radios, tipografia } from '../../../theme';

interface Props {
  campos: CampoCatalogo[];
  /** Claves ya usadas como columna: se muestran como agregadas, no desaparecen. */
  usadas: string[];
  onAgregar: (clave: string) => void;
}

export const NOMBRES_TIPO: Record<string, string> = {
  texto: 'Texto',
  numero: 'Número',
  fecha: 'Fecha',
  enumerado: 'Opciones',
  lista: 'Lista',
};

function sinAcentos(texto: string) {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/**
 * Paso 2, lado izquierdo: los datos que se pueden mostrar.
 *
 * Cada campo es una fila grande con su nombre, de que tipo es y un boton "Agregar"
 * escrito con todas las letras. Arrastrar es la via comoda en la web, nunca la unica:
 * el boton hace exactamente lo mismo y es el camino principal en el telefono.
 */
export function SelectorCampos({ campos, usadas, onAgregar }: Props) {
  const [busqueda, setBusqueda] = useState('');

  const visibles = useMemo(() => {
    const termino = sinAcentos(busqueda.trim());
    if (!termino) return campos;
    return campos.filter((campo) => sinAcentos(campo.etiqueta).includes(termino));
  }, [campos, busqueda]);

  return (
    <View>
      <View style={styles.buscador}>
        <Icono nombre="search-outline" tamano={20} />
        <TextInput
          style={styles.entradaBusqueda}
          value={busqueda}
          onChangeText={setBusqueda}
          placeholder="Buscá un dato por su nombre"
          placeholderTextColor={colores.tintaSuave}
          accessibilityLabel="Buscar un campo"
        />
      </View>

      {visibles.length === 0 ? (
        <Text style={styles.vacio}>No hay campos que coincidan con «{busqueda}».</Text>
      ) : null}

      {visibles.map((campo) => {
        const agregada = usadas.includes(campo.clave);
        return (
          <Arrastrable key={campo.clave} carga={campo.clave} style={styles.fila}>
            <Icono nombre="reorder-three-outline" tamano={20} color={colores.linea} />
            <View style={styles.textos}>
              <Text style={styles.nombre} numberOfLines={1}>
                {campo.etiqueta}
              </Text>
              <Text style={styles.detalle}>
                {NOMBRES_TIPO[campo.tipo] ?? campo.tipo}
                {campo.agrupable ? ' · se puede agrupar' : ''}
                {campo.agregable ? ' · se puede calcular' : ''}
              </Text>
            </View>
            {agregada ? (
              <View style={styles.agregada}>
                <Icono nombre="checkmark" tamano={16} />
                <Text style={styles.agregadaTexto}>Agregado</Text>
              </View>
            ) : (
              <Pressable
                onPress={() => onAgregar(campo.clave)}
                style={styles.boton}
                accessibilityRole="button"
                accessibilityLabel={'Agregar ' + campo.etiqueta + ' al reporte'}
              >
                <Icono nombre="add" tamano={18} color={colores.accion} />
                <Text style={styles.botonTexto}>Agregar</Text>
              </Pressable>
            )}
          </Arrastrable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  buscador: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.s,
    minHeight: 48,
    borderWidth: 1,
    borderColor: colores.linea,
    borderRadius: radios.m,
    paddingHorizontal: espaciado.m,
    backgroundColor: colores.superficie,
    marginBottom: espaciado.m,
  },
  entradaBusqueda: {
    flex: 1,
    minHeight: 48,
    fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.escala.cuerpo,
    color: colores.tinta,
  },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.m,
    minHeight: 64,
    borderWidth: 1,
    borderColor: colores.linea,
    borderRadius: radios.m,
    backgroundColor: colores.superficie,
    paddingVertical: espaciado.s,
    paddingHorizontal: espaciado.m,
    marginBottom: espaciado.s,
  },
  textos: { flex: 1 },
  nombre: {
    fontFamily: tipografia.familias.cuerpoFuerte,
    fontSize: tipografia.escala.cuerpo,
    color: colores.tinta,
  },
  detalle: {
    fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.escala.nota,
    color: colores.tintaSuave,
    marginTop: 2,
  },
  boton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 44,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colores.accion,
    borderRadius: radios.m,
    paddingHorizontal: espaciado.m,
    backgroundColor: colores.superficie,
  },
  botonTexto: {
    fontFamily: tipografia.familias.cuerpoFuerte,
    fontSize: tipografia.escala.nota,
    color: colores.accion,
  },
  agregada: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  agregadaTexto: {
    fontFamily: tipografia.familias.cuerpoFuerte,
    fontSize: tipografia.escala.nota,
    color: colores.tintaSuave,
  },
  vacio: {
    fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.escala.cuerpo,
    color: colores.tintaSuave,
    paddingVertical: espaciado.m,
  },
});
