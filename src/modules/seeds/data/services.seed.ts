export type service = {
  name: string;
  description: string;
  code: string;
  price: number;
};

export const serviceSeedComercial = {
  name: 'Desayuno',
  description: 'Desayuno completo con huevos, tocino y pan tostado',
  code: 'COMMERCIAL', //codigo generado por el sistema
  price: 15.0,
};

export const serviceSeedInternal = {
  name: 'Lavado',
  description: 'Lavado de ropa ',
  code: 'INTERNAL', //codigo generado por el sistema
  price: 0.0,
};
