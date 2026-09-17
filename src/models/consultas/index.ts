export type AreaJuridica = 'contratos' | 'obligaciones' | 'derechosReales' | 'sucesiones';

export interface Consulta {
  id: string;
  pregunta: string;
  respuesta: string;
  area: AreaJuridica;
  fecha: string;
}
