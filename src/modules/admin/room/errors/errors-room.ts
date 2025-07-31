import { ErrorMessages } from 'src/utils/error-handlers/service-error.handler';

// Mensajes de error para el módulo de habitaciones
export const roomErrorMessages: ErrorMessages = {
  notFound: 'Habitación no encontrada',
  alreadyExists: 'Ya existe una habitación con este número',
  invalidData: 'Datos de la habitación inválidos',
  notActive: 'La habitación no está activa',
  alreadyActive: 'La habitación ya está activa',
  inUse: 'La habitación está en uso y no puede ser eliminada',
  invalidOperation: 'Operación inválida para la habitación',

  // Errores específicos del estado de la habitación
  invalidStatus: 'Estado de habitación inválido',
  unavailable: 'La habitación no está disponible actualmente',
  occupied: 'La habitación está ocupada',
  cleaning: 'La habitación está en limpieza',

  // Errores de relación
  invalidRoomType:
    'El tipo de habitación especificado no existe o no es válido',
};
