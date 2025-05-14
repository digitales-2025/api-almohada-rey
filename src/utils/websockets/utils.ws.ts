import { Socket } from 'socket.io';
import { BaseWsErrorResponse } from 'src/websockets/dto/base-response.dto';

export function validateClientId(clientId: string, client: Socket): boolean {
  if (!client || !clientId) {
    return false;
  }

  if (clientId !== client.id) {
    return false;
  }
  return true;
}

export function parsePrefixedErrorMessage<T extends string>(
  errorMessage: string,
  prefix: T,
): { action: T | null; detail: string } {
  if (errorMessage.startsWith(prefix + ':')) {
    const detail = errorMessage.slice(prefix.length + 1).trim();
    return { action: prefix, detail };
  }
  return {
    action: null,
    detail: errorMessage,
  };
}

export function withErrorAction<T extends string = string>(
  errorMessage: string,
  prefix: T,
): string {
  if (errorMessage.startsWith(prefix + ':')) {
    return errorMessage;
  }
  return `${prefix}:${errorMessage}`;
}

export function checkIfHasErrorAction<T extends string = string>(
  errorMessage: string,
  prefixList: T[],
): boolean {
  for (const prefix of prefixList) {
    const { action } = parsePrefixedErrorMessage(errorMessage, prefix);
    if (action) {
      return true;
    }
  }
  return false;
}

//Esto podria incluso ser un decorator o el estandar ded manejo de errores
// export function ErrorAction<T>(action: T): MethodDecorator {
//   return function (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) {
//    const originalMethod = descriptor.value;
//     descriptor.value = function (...args: any[]) {
//      const result = originalMethod.apply(this, args);
//       return result;
//     };
//     return descriptor;
//   };
// }

// Define an interface for error actions
export interface ErrorActionHandler<T extends string = string> {
  handle(
    error: Partial<BaseWsErrorResponse>,
    sendingEvent: T,
    client?: Socket,
  ): void;
}

// Registry for error action handlers
export class ErrorActionRegistry<T extends string, V extends string> {
  private handlers: Map<T, ErrorActionHandler> = new Map();

  register(action: T, handler: ErrorActionHandler): void {
    this.handlers.set(action, handler);
  }

  handle(
    errorMessage: string,
    prefixList: T[],
    sendingEvent: V,
    client?: Socket,
  ): boolean {
    for (const prefix of prefixList) {
      const { action, detail } = parsePrefixedErrorMessage(
        errorMessage,
        prefix,
      );
      if (action && this.handlers.has(action)) {
        this.handlers.get(action)!.handle(
          {
            message: detail,
            error: true,
            // reason: reservationErrorReason[action], //The reason should be defined in the handler
            timestamp: new Date().toISOString(),
          },
          sendingEvent,
          client,
        );
        return true;
      }
    }
    return false;
  }
}

// Example usage:

// Define specific handlers
// export class LogErrorHandler implements ErrorActionHandler {
//   handle(detail: string): void {
//     console.error('LogErrorHandler:', detail);
//   }
// }

// export class NotifyErrorHandler implements ErrorActionHandler {
//   handle(detail: string): void {
//     // Notify logic here
//     console.warn('NotifyErrorHandler:', detail);
//   }
// }
