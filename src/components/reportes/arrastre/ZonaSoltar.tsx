import React from 'react';
import { View } from 'react-native';
import { ZonaSoltarProps } from './tipos';

export type { ContenidoZona, ZonaSoltarProps } from './tipos';

/**
 * Version nativa: solo contiene. Lo que en web se suelta, aca se agrega con botones.
 *
 * Acepta el mismo contrato que la version web, incluido el children como funcion, para
 * que un componente sirva igual en las dos plataformas. Como no hay arrastre, `encima`
 * es siempre false.
 */
export function ZonaSoltar({ children, style }: ZonaSoltarProps) {
  return (
    <View style={style}>{typeof children === 'function' ? children(false) : children}</View>
  );
}
