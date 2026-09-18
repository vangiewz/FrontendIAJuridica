import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { colores, tipografia, interlineado } from '../../theme';
import { AreaJuridica } from '../../models/consultas';

interface Props {
  texto: string;
  terminos: string[];
  areaDetectada: AreaJuridica | null;
}

function normalizar(t: string) {
  return t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

export function TerminosDetectados({ texto, terminos, areaDetectada }: Props) {
  if (!areaDetectada || terminos.length === 0) {
    return <Text style={styles.texto}>{texto}</Text>;
  }

  const mapAreaToCamel: Record<string, keyof typeof colores.areas> = {
    contratos: 'contratos',
    obligaciones: 'obligaciones',
    derechos_reales: 'derechosReales',
    sucesiones: 'sucesiones',
  };
  
  const colorArea = mapAreaToCamel[areaDetectada] ? colores.areas[mapAreaToCamel[areaDetectada]] : colores.areas.contratos;
  const termsNorm = terminos.map(t => normalizar(t));
  
  const regex = /([\p{L}\p{N}_]+|[^\p{L}\p{N}_]+)/gu;
  const parts = texto.match(regex) || [texto];

  return (
    <Text style={styles.texto}>
      {parts.map((part, index) => {
        const isWord = /^[\p{L}\p{N}_]+$/u.test(part);
        let match = false;
        if (isWord) {
          const normPart = normalizar(part);
          if (termsNorm.includes(normPart)) {
            match = true;
          }
        }
        
        if (match) {
          return (
            <Text
              key={index}
              style={[
                styles.termino,
                { borderBottomWidth: 2, borderBottomColor: colorArea }
              ]}
            >
              {part}
            </Text>
          );
        }
        return <Text key={index}>{part}</Text>;
      })}
    </Text>
  );
}

const styles = StyleSheet.create({
  texto: {
    fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.escala.cuerpo,
    color: colores.tinta,
    lineHeight: interlineado.cuerpo,
  },
  termino: {
    fontFamily: tipografia.familias.cuerpoFuerte,
    color: colores.tinta,
  },
});
