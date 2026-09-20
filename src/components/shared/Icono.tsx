import React from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colores } from '../../theme';

/** Los nombres validos de la familia; TypeScript rechaza cualquier icono inexistente. */
export type NombreIcono = React.ComponentProps<typeof Ionicons>['name'];

interface Props {
  nombre: NombreIcono;
  tamano?: number;
  color?: string;
}

/**
 * Un icono, siempre de la misma familia (Ionicons).
 *
 * Es una envoltura minima y a proposito: unifica el tamano y el color por defecto desde
 * el tema para que no aparezcan iconos de distintos pesos y tonos por la pantalla. No
 * agrega ninguna otra abstraccion.
 */
export function Icono({ nombre, tamano = 22, color = colores.tintaSuave }: Props) {
  return <Ionicons name={nombre} size={tamano} color={color} />;
}
