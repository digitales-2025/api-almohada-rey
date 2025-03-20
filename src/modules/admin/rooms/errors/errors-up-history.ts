import { ErrorMessages } from 'src/common/error-handlers/service-error.handler';

// Mensajes de error para el módulo de actualización de historia médica
export const upHistoryErrorMessages: ErrorMessages = {
  notFound: 'Actualización de historia médica no encontrada',
  alreadyExists: 'La actualización de historia médica ya existe',
  invalidData: 'Datos de la actualización de historia médica inválidos',
  notActive: 'La actualización de historia médica no está activa',
  alreadyActive: 'La actualización de historia médica ya está activa',
  inUse:
    'La actualización de historia médica está en uso y no puede ser eliminada',
  invalidOperation:
    'Operación inválida para la actualización de historia médica',
};
