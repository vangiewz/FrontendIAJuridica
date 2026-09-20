import React from 'react';
import { View } from 'react-native';
import { ArrastrableProps } from './tipos';

export type { ArrastrableProps } from './tipos';

/**
 * Arrastre real de navegador, con la API estandar de HTML5.
 *
 * El envoltorio es un <div draggable> porque react-native-web corre sobre React DOM:
 * en un archivo .web.tsx se puede devolver DOM directamente y lo de adentro sigue
 * siendo React Native. No hace falta ninguna libreria de drag and drop.
 */
export function Arrastrable({ carga, children, style }: ArrastrableProps) {
  return (
    <div
      draggable
      onDragStart={(evento: any) => {
        evento.dataTransfer.setData('text/plain', carga);
        evento.dataTransfer.effectAllowed = 'copyMove';
      }}
      style={{ cursor: 'grab' }}
    >
      <View style={style}>{children}</View>
    </div>
  );
}
