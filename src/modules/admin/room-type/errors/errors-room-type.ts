import { ErrorMessages } from 'src/utils/error-handlers/service-error.handler';

// Mensajes de error para el módulo de tipos de habitaciones
export const roomTypeErrorMessages: ErrorMessages = {
  notFound: 'Tipo de habitación no encontrado',
  alreadyExists: 'Ya existe un tipo de habitación con estas características',
  invalidData: 'Datos del tipo de habitación inválidos',
  notActive: 'El tipo de habitación no está activo',
  alreadyActive: 'El tipo de habitación ya está activo',
  inUse: 'El tipo de habitación está en uso y no puede ser eliminado',
  invalidOperation: 'Operación inválida para el tipo de habitación',

  // Errores específicos para imágenes
  imageNotFound: 'Imagen del tipo de habitación no encontrada',
  tooManyImages:
    'Un tipo de habitación solo puede tener un máximo de 5 imágenes',
  imageDeletionError: 'Error al eliminar la imagen del tipo de habitación',
  imageUploadError: 'Error al subir la imagen del tipo de habitación',
};
