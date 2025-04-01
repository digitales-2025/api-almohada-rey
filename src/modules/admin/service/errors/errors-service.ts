import { ErrorMessages } from 'src/utils/error-handlers/service-error.handler';

// Mensajes de error para el módulo de servicios
export const serviceErrorMessages: ErrorMessages = {
  notFound: 'Servicio no encontrado',
  alreadyExists: 'Ya existe un servicio con este nombre',
  invalidData: 'Datos del servicio inválidos',
  notActive: 'El servicio no está activo',
  alreadyActive: 'El servicio ya está activo',
  inUse:
    'El servicio está asociado a reservaciones activas y no puede ser eliminado',
  invalidOperation: 'Operación inválida para el servicio',

  // Errores específicos del servicio
  invalidPrice: 'El precio del servicio es inválido',
  zeroPrice:
    'El precio del servicio no puede ser cero para servicios comerciales',
  duplicatedCode: 'Ya existe un servicio con este código',
  codeGenerationFailed: 'Error al generar el código único del servicio',

  // Errores de asignación
  notAvailableForRoom:
    'Este servicio no está disponible para este tipo de habitación',
  notAvailableForDate:
    'Este servicio no está disponible en la fecha solicitada',

  // Errores de tipo
  invalidServiceType: 'El tipo de servicio especificado no es válido',
  commercialServiceRequired: 'Esta operación requiere un servicio comercial',
  internalServiceRequired: 'Esta operación requiere un servicio interno',
};
