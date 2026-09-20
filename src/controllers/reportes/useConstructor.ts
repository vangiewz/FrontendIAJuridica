import { useCallback, useMemo, useState } from 'react';
import {
  AgregacionReporte, Catalogo, Direccion, EntidadCatalogo, EspecificacionReporte,
  FiltroReporte, FuncionAgregacion, OrdenReporte, Visualizacion, campoDe,
  especificacionVacia, etiquetaDe,
} from '../../models/reportes';

/**
 * El estado del constructor visual y su traduccion a `EspecificacionReporte`.
 *
 * No construye consultas ni conoce SQL: arma exactamente la misma estructura que
 * produce el modo por lenguaje natural, y el backend la valida y la ejecuta con el
 * mismo motor. Lo que se puede arrastrar, agrupar o agregar sale del catalogo, no de
 * una lista escrita aca.
 */
export function useConstructor(catalogo: Catalogo | null) {
  const [entidad, setEntidadCruda] = useState('');
  const [columnas, setColumnas] = useState<string[]>([]);
  const [agrupacion, setAgrupacion] = useState<string[]>([]);
  const [agregaciones, setAgregaciones] = useState<AgregacionReporte[]>([]);
  const [filtros, setFiltros] = useState<FiltroReporte[]>([]);
  const [orden, setOrden] = useState<OrdenReporte[]>([]);
  const [visualizacion, setVisualizacion] = useState<Visualizacion>('tabla');
  const [aviso, setAviso] = useState<string | null>(null);

  const definicion: EntidadCatalogo | undefined = useMemo(
    () => catalogo?.entidades.find((e) => e.entidad === entidad),
    [catalogo, entidad],
  );

  const reiniciar = useCallback((nueva: string) => {
    setEntidadCruda(nueva);
    setColumnas([]);
    setAgrupacion([]);
    setAgregaciones([]);
    setFiltros([]);
    setOrden([]);
    setVisualizacion('tabla');
    setAviso(null);
  }, []);

  /** Cambiar de entidad vacia el resto: los campos de una no existen en la otra. */
  const setEntidad = useCallback(
    (nueva: string) => {
      if (nueva !== entidad) reiniciar(nueva);
    },
    [entidad, reiniciar],
  );

  const limpiar = useCallback(() => reiniciar(''), [reiniciar]);

  // --- Columnas ---------------------------------------------------------------
  const agregarColumna = useCallback(
    (clave: string) => {
      setAviso(null);
      setColumnas((previas) => (previas.includes(clave) ? previas : [...previas, clave]));
    },
    [],
  );

  const quitarColumna = useCallback((clave: string) => {
    setColumnas((previas) => previas.filter((c) => c !== clave));
  }, []);

  /** Mueve una columna una posicion; es lo que hace el arrastre y tambien las flechas. */
  const moverColumna = useCallback((desde: number, hasta: number) => {
    setColumnas((previas) => {
      if (hasta < 0 || hasta >= previas.length) return previas;
      const copia = [...previas];
      const [movida] = copia.splice(desde, 1);
      copia.splice(hasta, 0, movida);
      return copia;
    });
  }, []);

  /** Soltar una columna sobre otra la coloca en esa posicion. */
  const soltarColumnaEn = useCallback(
    (clave: string, indiceDestino: number) => {
      setColumnas((previas) => {
        const origen = previas.indexOf(clave);
        const copia = previas.filter((c) => c !== clave);
        const destino = origen !== -1 && origen < indiceDestino ? indiceDestino - 1 : indiceDestino;
        copia.splice(Math.max(0, Math.min(destino, copia.length)), 0, clave);
        return copia;
      });
    },
    [],
  );

  // --- Agrupacion -------------------------------------------------------------
  const agregarAgrupacion = useCallback(
    (clave: string) => {
      const campo = campoDe(definicion, clave);
      if (!campo?.agrupable) {
        // El catalogo manda: si el backend no agrupa por ese campo, aca tampoco se deja.
        setAviso(`No se puede agrupar por «${campo?.etiqueta ?? clave}».`);
        return;
      }
      setAviso(null);
      setAgrupacion((previas) => (previas.includes(clave) ? previas : [...previas, clave]));
    },
    [definicion],
  );

  const quitarAgrupacion = useCallback((clave: string) => {
    setAgrupacion((previas) => previas.filter((c) => c !== clave));
  }, []);

  // --- Agregaciones -----------------------------------------------------------
  const agregarAgregacion = useCallback(() => {
    setAgregaciones((previas) => [...previas, { funcion: 'conteo', campo: '' }]);
  }, []);

  const actualizarAgregacion = useCallback(
    (indice: number, cambio: Partial<AgregacionReporte>) => {
      setAgregaciones((previas) =>
        previas.map((a, i) => (i === indice ? { ...a, ...cambio } : a)),
      );
    },
    [],
  );

  const quitarAgregacion = useCallback((indice: number) => {
    setAgregaciones((previas) => previas.filter((_, i) => i !== indice));
  }, []);

  // --- Filtros ----------------------------------------------------------------
  const agregarFiltro = useCallback(
    (clave?: string) => {
      const campo = clave ? campoDe(definicion, clave) : undefined;
      if (clave && !campo?.filtrable) {
        setAviso(`No se puede filtrar por «${campo?.etiqueta ?? clave}».`);
        return;
      }
      setAviso(null);
      setFiltros((previas) => [
        ...previas,
        {
          campo: clave ?? '',
          operador: campo?.operadores[0] ?? 'igual',
          valor: '',
          valor_hasta: '',
        },
      ]);
    },
    [definicion],
  );

  const actualizarFiltro = useCallback(
    (indice: number, cambio: Partial<FiltroReporte>) => {
      setFiltros((previas) =>
        previas.map((f, i) => {
          if (i !== indice) return f;
          const siguiente = { ...f, ...cambio };
          // Al cambiar de campo, el operador anterior puede no aplicar al tipo nuevo.
          if (cambio.campo !== undefined) {
            const campo = campoDe(definicion, cambio.campo);
            if (!campo?.operadores.includes(siguiente.operador)) {
              siguiente.operador = campo?.operadores[0] ?? 'igual';
            }
            siguiente.valor = '';
            siguiente.valor_hasta = '';
          }
          return siguiente;
        }),
      );
    },
    [definicion],
  );

  const quitarFiltro = useCallback((indice: number) => {
    setFiltros((previas) => previas.filter((_, i) => i !== indice));
  }, []);

  // --- Orden ------------------------------------------------------------------
  const ordenarPor = useCallback(
    (clave: string, direccion: Direccion = 'desc') => {
      const campo = campoDe(definicion, clave);
      if (!campo?.ordenable) {
        setAviso(`No se puede ordenar por «${campo?.etiqueta ?? clave}».`);
        return;
      }
      setAviso(null);
      setOrden([{ campo: clave, direccion }]);
    },
    [definicion],
  );

  const quitarOrden = useCallback(() => setOrden([]), []);

  // --- Especificacion ---------------------------------------------------------
  const especificacion: EspecificacionReporte = useMemo(
    () => ({
      ...especificacionVacia(entidad),
      columnas,
      filtros,
      agrupacion,
      agregaciones,
      orden,
      visualizacion,
    }),
    [entidad, columnas, filtros, agrupacion, agregaciones, orden, visualizacion],
  );

  /** Carga una especificacion existente: es como se pasa del modo IA al visual. */
  const cargarDesde = useCallback((spec: EspecificacionReporte) => {
    setEntidadCruda(spec.entidad);
    setColumnas([...spec.columnas]);
    setAgrupacion([...spec.agrupacion]);
    setAgregaciones(spec.agregaciones.map((a) => ({ ...a })));
    setFiltros(spec.filtros.map((f) => ({ ...f })));
    setOrden(spec.orden.map((o) => ({ ...o })));
    setVisualizacion(spec.visualizacion);
    setAviso(null);
  }, []);

  /** Lo que impide ejecutar. El backend vuelve a validar todo de todos modos. */
  const problemas = useMemo(() => {
    const lista: string[] = [];
    if (!entidad) lista.push('Seleccioná una entidad.');
    agregaciones.forEach((agregacion) => {
      if (agregacion.funcion !== 'conteo' && !agregacion.campo) {
        lista.push(`Elegí el campo para el ${agregacion.funcion}.`);
      }
    });
    filtros.forEach((filtro, indice) => {
      const nombre = filtro.campo ? etiquetaDe(definicion, filtro.campo) : `#${indice + 1}`;
      if (!filtro.campo) lista.push(`Elegí el campo del filtro ${nombre}.`);
      else if (!filtro.valor.trim()) lista.push(`Completá el valor del filtro «${nombre}».`);
      else if (filtro.operador === 'entre' && !filtro.valor_hasta.trim()) {
        lista.push(`El filtro «${nombre}» necesita un valor final.`);
      }
    });
    return lista;
  }, [entidad, agregaciones, filtros, definicion]);

  /** Cosas que conviene saber pero no impiden generar el reporte. */
  const sugerencias = useMemo(() => {
    const lista: string[] = [];
    if (entidad && !columnas.length && !agrupacion.length && !agregaciones.length) {
      lista.push('Sin columnas elegidas se usan las habituales de la entidad.');
    }
    if ((visualizacion === 'barras' || visualizacion === 'torta') && !agrupacion.length) {
      lista.push('Un gráfico necesita una agrupación; si no, se mostrará como tabla.');
    }
    if (agrupacion.length && columnas.length) {
      lista.push('Con una agrupación activa se muestran los grupos y sus cálculos, '
        + 'no las columnas sueltas.');
    }
    return lista;
  }, [entidad, columnas, agrupacion, agregaciones, visualizacion]);

  return {
    entidad, setEntidad, definicion,
    columnas, agregarColumna, quitarColumna, moverColumna, soltarColumnaEn,
    agrupacion, agregarAgrupacion, quitarAgrupacion,
    agregaciones, agregarAgregacion, actualizarAgregacion, quitarAgregacion,
    filtros, agregarFiltro, actualizarFiltro, quitarFiltro,
    orden, ordenarPor, quitarOrden,
    visualizacion, setVisualizacion,
    especificacion, cargarDesde, limpiar,
    problemas, sugerencias, aviso,
  };
}
