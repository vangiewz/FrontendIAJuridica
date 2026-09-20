import { StyleProp, ViewStyle } from 'react-native';
import { ReactNode } from 'react';

/**
 * Contrato compartido entre la version web y la nativa del arrastre.
 *
 * Vive en un archivo sin variante de plataforma a proposito: si `ZonaSoltar.web.tsx`
 * importara de `./ZonaSoltar`, en web Metro resolveria ese import al propio archivo
 * .web y no al .tsx, que es exactamente lo que rompia en tiempo de ejecucion.
 */
export interface ArrastrableProps {
  /** Lo que recibe la zona al soltar: la clave del campo. */
  carga: string;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}

/** El contenido puede ser fijo o depender de si hay algo arrastrandose encima. */
export type ContenidoZona = ReactNode | ((encima: boolean) => ReactNode);

export interface ZonaSoltarProps {
  onSoltar: (carga: string) => void;
  children: ContenidoZona;
  style?: StyleProp<ViewStyle>;
}
