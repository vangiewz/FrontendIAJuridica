import React, { useState } from 'react';
import { View } from 'react-native';
import { ZonaSoltarProps } from './tipos';

export type { ContenidoZona, ZonaSoltarProps } from './tipos';

/**
 * Donde se sueltan los campos arrastrados.
 *
 * Mientras algo pasa por encima le avisa a su contenido, para que la zona pueda decir
 * "Solta aca" en vez de dejar al usuario adivinando si el destino es valido.
 */
export function ZonaSoltar({ onSoltar, children, style }: ZonaSoltarProps) {
  const [encima, setEncima] = useState(false);
  const contenido = typeof children === 'function' ? children(encima) : children;

  return (
    <div
      onDragOver={(evento: any) => {
        // Sin preventDefault el navegador no considera valido el destino y no suelta.
        evento.preventDefault();
        evento.dataTransfer.dropEffect = 'copy';
        if (!encima) setEncima(true);
      }}
      onDragLeave={() => setEncima(false)}
      onDrop={(evento: any) => {
        evento.preventDefault();
        setEncima(false);
        const carga = evento.dataTransfer.getData('text/plain');
        if (carga) onSoltar(carga);
      }}
    >
      <View style={style}>{contenido}</View>
    </div>
  );
}
