import { BadRequestException, Logger, NotFoundException } from '@nestjs/common';
import { roomCleanErrorMessages } from 'src/modules/admin/room-clean/errors/errors-room-clean';
import { roomTypeErrorMessages } from 'src/modules/admin/room-type/errors/errors-room-type';
import { roomErrorMessages } from 'src/modules/admin/room/errors/errors-room';
import { handleException } from 'src/utils';

export type ServiceAction =
  | 'creating'
  | 'updating'
  | 'getting'
  | 'deleting'
  | 'reactivating'
  | 'deactivating'
  | 'activating'
  | 'processing'
  | 'verifying'
  | 'rejecting'
  | 'cancelling'
  | 'submitting';

export interface ErrorMessages {
  notFound: string;
  alreadyExists: string;
  invalidData: string;
  notActive: string;
  alreadyActive: string;
  inUse: string;
  invalidOperation: string;
  [key: string]: string;
}

export class BaseErrorHandler {
  constructor(
    private readonly logger: Logger,
    private readonly entityName: string,
    private readonly errorMessages: ErrorMessages,
  ) {}

  handleError(error: Error, action: ServiceAction): never {
    const logMessage = `Error ${action} ${this.entityName}`;

    if (
      error instanceof BadRequestException ||
      error instanceof NotFoundException
    ) {
      this.logger.warn(`${logMessage}: ${error.message}`);
      const message = this.getDefaultOrCustomMessage(error.message);
      throw new BadRequestException(message);
    }

    this.logger.error(`${logMessage}: ${error.message}`, error.stack);
    handleException(error, this.getSpanishErrorMessage(action));
  }

  handleValidationError(error: Error, context: string): never {
    const logMessage = `Validation error in ${this.entityName}`;

    if (
      error instanceof BadRequestException ||
      error instanceof NotFoundException
    ) {
      this.logger.warn(`${logMessage}: ${error.message}`);
      const message = this.getDefaultOrCustomMessage(error.message);
      throw new BadRequestException(message);
    }

    this.logger.error(`${logMessage}: ${error.message}`, error.stack);
    handleException(error, `Error de validación en ${context}`);
  }

  handleBatchError(error: Error, action: ServiceAction): never {
    const logMessage = `Error in batch ${action} ${this.entityName}`;

    if (
      error instanceof BadRequestException ||
      error instanceof NotFoundException
    ) {
      this.logger.warn(`${logMessage}: ${error.message}`);
      const message = this.getDefaultOrCustomMessage(error.message);
      throw new BadRequestException(message);
    }

    this.logger.error(`${logMessage}: ${error.message}`, error.stack);
    handleException(
      error,
      `Error al procesar múltiples ${this.getEntityNameInSpanish()}`,
    );
  }

  private getDefaultOrCustomMessage(message: string): string {
    if (message === 'Bad Request' || message === 'Not Found') {
      return this.errorMessages.invalidData;
    }
    return this.getSpanishMessage(message);
  }

  private getSpanishMessage(originalMessage: string): string {
    if (originalMessage.includes('not found'))
      return this.errorMessages.notFound;
    if (originalMessage.includes('already exists'))
      return this.errorMessages.alreadyExists;
    if (originalMessage.includes('invalid'))
      return this.errorMessages.invalidData;
    if (originalMessage.includes('not active'))
      return this.errorMessages.notActive;
    if (originalMessage.includes('already active'))
      return this.errorMessages.alreadyActive;
    if (originalMessage.includes('in use')) return this.errorMessages.inUse;
    return originalMessage;
  }

  private getSpanishErrorMessage(action: ServiceAction): string {
    const actionMessages = {
      creating: 'crear',
      updating: 'actualizar',
      getting: 'obtener',
      deleting: 'eliminar',
      reactivating: 'reactivar',
      deactivating: 'desactivar',
      activating: 'activar',
      processing: 'procesar',
      verifying: 'verificar',
      rejecting: 'rechazar',
      cancelling: 'cancelar',
      submitting: 'enviar',
    };

    return `Error al ${actionMessages[action]} ${this.getEntityNameInSpanish()}`;
  }

  private getEntityNameInSpanish(): string {
    return this.entityName.toLowerCase();
  }
}

// Mensajes de error para cada entidad

// Registro de todos los mensajes de error por entidad
export const entityErrorMessages = {
  roomTypeErrorMessages,
  roomErrorMessages,
  roomCleanErrorMessages,
  // Para agregar un nuevo módulo:
  // 1. Crear constante de mensajes de error siguiendo la interfaz ErrorMessages
  // 2. Agregar aquí con una clave apropiada
  // Ejemplo:
  // inventory: inventoryErrorMessages,
} as const;

// Helper de TypeScript para obtener tipos de entidad
export type EntityType = keyof typeof entityErrorMessages;

// Función auxiliar para obtener mensajes de error de una entidad
export function getErrorMessagesForEntity(entity: EntityType): ErrorMessages {
  return entityErrorMessages[entity];
}
