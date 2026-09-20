import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { AccionesConstructor } from '../../components/reportes/constructor/AccionesConstructor';
import { AjustesReporte } from '../../components/reportes/constructor/AjustesReporte';
import { ColumnasSeleccionadas } from '../../components/reportes/constructor/ColumnasSeleccionadas';
import { Paso } from '../../components/reportes/constructor/Paso';
import { PlantillasRapidas } from '../../components/reportes/constructor/PlantillasRapidas';
import { ResumenConfiguracion } from '../../components/reportes/constructor/ResumenConfiguracion';
import { SelectorCampos } from '../../components/reportes/constructor/SelectorCampos';
import { SelectorEntidad } from '../../components/reportes/constructor/SelectorEntidad';
import { SelectorVisualizacion } from '../../components/reportes/constructor/SelectorVisualizacion';
import { useConstructor } from '../../controllers/reportes/useConstructor';
import { Catalogo, EspecificacionReporte, Visualizacion } from '../../models/reportes';
import { colores, espaciado, tipografia } from '../../theme';

interface Props {
  catalogo: Catalogo;
  constructor: ReturnType<typeof useConstructor>;
  cargando: boolean;
  onGenerar: (especificacion: EspecificacionReporte) => void;
}

// Dos paneles de campos necesitan unos 480 px cada uno mas los margenes de la pagina;
// por debajo de esto se apilan, que se lee mejor que dos columnas estrechas.
const ANCHO_DOS_PANELES = 1024;
const MILISEGUNDOS_DESTACADO = 1400;

/**
 * Constructor visual de reportes, en cuatro pasos.
 *
 * Arma la misma `ReporteEspecificacion` que el modo por lenguaje natural y la manda al
 * mismo motor; aca no hay SQL ni conocimiento de la base. Lo que cambio respecto de la
 * version anterior es el orden en que se muestra: primero que datos, despues cuales
 * mostrar, y solo si hace falta, los ajustes. Nada de lo opcional aparece abierto.
 */
export function ConstructorView({ catalogo, constructor: c, cargando, onGenerar }: Props) {
  const { width } = useWindowDimensions();
  const dosPaneles = width >= ANCHO_DOS_PANELES;
  const [destacada, setDestacada] = useState<string | null>(null);

  // El resalte de la columna recien agregada se apaga solo: confirma la accion sin
  // dejar un estado permanente que despues confunda.
  useEffect(() => {
    if (!destacada) return;
    const temporizador = setTimeout(() => setDestacada(null), MILISEGUNDOS_DESTACADO);
    return () => clearTimeout(temporizador);
  }, [destacada]);

  const agregarColumna = (clave: string) => {
    c.agregarColumna(clave);
    setDestacada(clave);
  };

  const hayConfiguracion = Boolean(
    c.entidad || c.columnas.length || c.filtros.length || c.agrupacion.length,
  );

  return (
    <View>
      <Text style={styles.titulo}>Construí tu reporte</Text>
      <Text style={styles.bajada}>
        Elegí los datos que querés ver. Podés arrastrar los campos o simplemente tocar
        «Agregar».
      </Text>

      <PlantillasRapidas onElegir={c.cargarDesde} />

      <Paso
        numero={1}
        titulo="¿Sobre qué querés hacer el reporte?"
        ayuda="Elegí el tipo de información. Después vas a poder elegir qué datos mostrar."
      >
        <SelectorEntidad
          entidades={catalogo.entidades}
          elegida={c.entidad}
          onElegir={c.setEntidad}
        />
      </Paso>

      <Paso
        numero={2}
        titulo="¿Qué datos querés mostrar?"
        ayuda="Son las columnas que van a aparecer en el resultado, en este orden."
        inactivo={!c.definicion}
      >
        {!c.definicion ? (
          <Text style={styles.espera}>Primero elegí un tipo de información.</Text>
        ) : (
          <View style={[styles.paneles, dosPaneles && styles.panelesFila]}>
            <View style={styles.panel}>
              <Text style={styles.tituloPanel}>Campos disponibles</Text>
              <SelectorCampos
                campos={c.definicion.campos}
                usadas={c.columnas}
                onAgregar={agregarColumna}
              />
            </View>
            <View style={styles.panel}>
              <Text style={styles.tituloPanel}>Tu reporte</Text>
              <ColumnasSeleccionadas
                definicion={c.definicion}
                columnas={c.columnas}
                destacada={destacada}
                onSoltar={agregarColumna}
                onSoltarEn={c.soltarColumnaEn}
                onQuitar={c.quitarColumna}
                onMover={c.moverColumna}
              />
            </View>
          </View>
        )}
      </Paso>

      <Paso
        numero={3}
        titulo="¿Querés ajustar algo? (opcional)"
        ayuda="Solo si lo necesitás. Podés generar el reporte sin abrir nada de esto."
        inactivo={!c.definicion}
      >
        {!c.definicion ? (
          <Text style={styles.espera}>Disponible al elegir un tipo de información.</Text>
        ) : (
          <AjustesReporte catalogo={catalogo} constructor={c} />
        )}
      </Paso>

      <Paso
        numero={4}
        titulo="¿Cómo querés ver el resultado?"
        ayuda="Cambia solo la forma de mostrarlo; los datos son los mismos."
        inactivo={!c.definicion}
      >
        <SelectorVisualizacion
          opciones={catalogo.visualizaciones.map((v) => ({
            clave: v.clave as Visualizacion,
            etiqueta: v.etiqueta,
          }))}
          elegida={c.visualizacion}
          onElegir={c.setVisualizacion}
        />
      </Paso>

      {c.definicion ? (
        <View style={styles.cierre}>
          <ResumenConfiguracion constructor={c} />
          <AccionesConstructor
            problemas={c.problemas}
            sugerencias={c.sugerencias}
            cargando={cargando}
            hayConfiguracion={hayConfiguracion}
            onGenerar={() => onGenerar(c.especificacion)}
            onLimpiar={c.limpiar}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  titulo: {
    fontFamily: tipografia.familias.titulo,
    fontSize: tipografia.escala.titulo,
    color: colores.tinta,
  },
  bajada: {
    fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.escala.cuerpo,
    color: colores.tintaSuave,
    lineHeight: 24,
    marginTop: espaciado.s,
    marginBottom: espaciado.xl,
    maxWidth: 640,
  },
  espera: {
    fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.escala.cuerpo,
    color: colores.tintaSuave,
  },
  paneles: { gap: espaciado.l },
  panelesFila: { flexDirection: 'row', alignItems: 'flex-start' },
  panel: { flex: 1, minWidth: 0 },
  tituloPanel: {
    fontFamily: tipografia.familias.cuerpoFuerte,
    fontSize: tipografia.escala.cuerpo,
    color: colores.tinta,
    marginBottom: espaciado.s,
  },
  cierre: { gap: espaciado.m, maxWidth: 760 },
});
