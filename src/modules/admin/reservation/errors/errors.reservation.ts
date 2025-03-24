import { ErrorMessages } from 'src/utils/error-handlers/service-error.handler';

export const reservationErrorMessages: ErrorMessages = {
  notFound: 'Reservación no encontrada',
  alreadyExists: 'La reservación ya existe',
  invalidData: 'Datos de la reservación inválidos',
  notActive: 'La reservación no está activa',
  alreadyActive: 'La reservación ya está activa',
  inUse: 'La reservación está en uso y no puede ser eliminada',
  invalidOperation: 'Operación inválida para la reservación',
  generatorNotFound:
    'No se encontró un generador para el tipo de reservación especificado',
  invalidReservationType: 'Tipo de reservación inválido',
  invalidStatus: 'Estado de reservación inválido',
  submitting: 'La reservación no puede ser procesada',
};
