import React from 'react';
import { View } from 'react-native';
import { ArrastrableProps } from './tipos';

export type { ArrastrableProps } from './tipos';

/**
 * Version nativa: no arrastra.
 *
 * En Android/iOS el arrastre entre listas exige gestos y medicion de posiciones que
 * traen una dependencia nativa pesada, asi que el mismo resultado se consigue con los
 * botones de accion de cada campo. El arrastre real vive en `Arrastrable.web.tsx`.
 */
export function Arrastrable({ children, style }: ArrastrableProps) {
  return <View style={style}>{children}</View>;
}
