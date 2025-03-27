import { ErrorMessages } from 'src/utils/error-handlers/service-error.handler';

// Mensajes de error para el módulo de limpieza de habitaciones
export const roomCleanErrorMessages: ErrorMessages = {
  notFound: 'Registro de limpieza no encontrado',
  alreadyExists:
    'Ya existe un registro de limpieza para esta habitación en la fecha indicada',
  invalidData: 'Datos del registro de limpieza inválidos',
  notActive: 'El registro de limpieza no está activo',
  alreadyActive: 'El registro de limpieza ya está activo',
  invalidOperation: 'Operación inválida para el registro de limpieza',

  // Errores relacionados con fechas
  invalidDate: 'Fecha de limpieza inválida',
  pastDate: 'No se pueden crear registros para fechas pasadas',
  futureDate: 'La fecha especificada está demasiado en el futuro',

  // Errores de relación
  roomNotFound: 'La habitación especificada no existe',
  userCheckNotFound: 'El usuario verificador especificado no existe',

  // Errores de estado de la habitación
  roomUnavailable: 'La habitación no está disponible para limpieza',
  roomOccupied: 'No se puede registrar limpieza de una habitación ocupada',

  // Errores de validación específicos
  missingStaffInfo: 'Información del personal de limpieza incompleta',
  duplicateCleaningRecord:
    'Ya existe un registro de limpieza para esta habitación hoy',
  inUse: 'El registro de limpieza está en uso',
  // Errores de operación
  cannotModify: 'No se puede modificar un registro de limpieza completado',
  cannotDelete: 'No se puede eliminar un registro de limpieza completado',
};
