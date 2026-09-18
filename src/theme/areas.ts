import { colores } from './index';
import { AreaJuridica } from '../models/consultas';

/** Unico lugar que conoce las dos formas de nombrar un area, para que no vuelvan a divergir. */
export function colorDeArea(area: AreaJuridica | null | undefined): string | undefined {
  if (!area) return undefined;

  // El tema nombra las areas en camelCase y la API las devuelve en snake_case. Cuando este
  // mapeo estaba duplicado, una copia indexaba por la clave del tema y devolvia undefined:
  // la ficha activa quedaba sin fondo, con texto blanco sobre el papel.
  // responsabilidad_civil comparte el color de obligaciones: DESIGN.md define la terracota
  // como "Obligaciones y responsabilidad civil", asi que no se inventa un quinto color.
  const mapa: Record<AreaJuridica, keyof typeof colores.areas> = {
    contratos: 'contratos',
    obligaciones: 'obligaciones',
    derechos_reales: 'derechosReales',
    sucesiones: 'sucesiones',
    responsabilidad_civil: 'obligaciones',
  };
  
  const clave = mapa[area];
  return clave ? colores.areas[clave] : undefined;
}
