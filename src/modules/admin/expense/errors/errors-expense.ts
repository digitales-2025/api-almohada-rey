import { ErrorMessages } from 'src/utils/error-handlers/service-error.handler';

// Mensajes de error para el módulo de gastos del hotel
export const expenseErrorMessages: ErrorMessages = {
  notFound: 'Gasto no encontrado',
  alreadyExists:
    'Ya existe un gasto con esta descripción/documento en esta fecha', // Podría ser útil, pero depende de la lógica de negocio
  invalidData: 'Datos del gasto inválidos',
  notActive: 'El gasto no está activo', // No aplica directamente al modelo actual
  alreadyActive: 'El gasto ya está activo', // No aplica directamente al modelo actual
  inUse: 'El gasto está relacionado y no puede ser eliminado', // Podría aplicar si hay relaciones futuras
  invalidOperation: 'Operación inválida para el gasto',

  // Errores específicos de gastos
  invalidAmount: 'El monto del gasto debe ser un número positivo',
  invalidDateFormat: 'El formato de la fecha del gasto es inválido',
  invalidCategory: 'La categoría del gasto especificada no es válida',
  invalidPaymentMethod: 'El método de pago especificado no es válido',
  invalidDocumentType: 'El tipo de documento especificado no es válido',
  documentNumberRequired:
    'El número de documento es requerido para este tipo de documento', // Si aplica lógica condicional
};
