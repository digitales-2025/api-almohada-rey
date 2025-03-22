import { ErrorMessages } from 'src/common/error-handlers/service-error.handler';

// Mensajes de error para el módulo de recetas médicas
export const recipeErrorMessages: ErrorMessages = {
  notFound: 'Receta médica no encontrada',
  alreadyExists: 'La receta médica ya existe',
  invalidData: 'Datos de la receta médica inválidos',
  notActive: 'La receta médica no está activa',
  alreadyActive: 'La receta médica ya está activa',
  inUse: 'La receta médica está en uso y no puede ser eliminada',
  invalidOperation: 'Operación inválida para la receta médica',
};
