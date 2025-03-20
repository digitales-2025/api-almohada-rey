import { ErrorMessages } from 'src/utils/error-handlers/service-error.handler';

// Mensajes de error para el módulo de habitaciones
export const roomErrorMessages: ErrorMessages = {
  notFound: 'Habitación no encontrada',
  alreadyExists: 'Ya existe una habitación con este número',
  invalidData: 'Datos de la habitación inválidos',
  notActive: 'La habitación no está activa',
  alreadyActive: 'La habitación ya está activa',
  inUse: 'La habitación está ocupada y no puede ser eliminada',
  invalidOperation: 'Operación inválida para la habitación',

  // Errores específicos para habitaciones
  alreadyReserved: 'La habitación ya está reservada',
  alreadyOccupied: 'La habitación ya está ocupada',
  unavailableStatus: 'No se puede cambiar el estado de una habitación ocupada',
  invalidStatusChange: 'Cambio de estado no permitido',
};
