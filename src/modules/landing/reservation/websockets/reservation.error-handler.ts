import { Socket } from 'socket.io';
import {
  ErrorActionHandler,
  ErrorActionRegistry,
} from 'src/utils/websockets/utils.ws';
import { BaseWsErrorResponse } from 'src/websockets/dto/base-response.dto';
import { SendingEventsKeys } from './ws.types';
import { Logger } from '@nestjs/common';

type ReservationErrorAction =
  | 'shouldCancel'
  | 'shouldNotify'
  | 'shouldRedirect';
type ReservationErrorReasons =
  | 'RESERVATION_CANCELLED'
  | 'RESERVATION_NOTIFICATION'
  | 'RESERVATION_REDIRECT';

export const reservationErrorActions: ReservationErrorAction[] = [
  'shouldCancel',
  'shouldNotify',
  'shouldRedirect',
];

export const reservationErrorReason: Record<
  ReservationErrorAction,
  ReservationErrorReasons
> = {
  shouldCancel: 'RESERVATION_CANCELLED',
  shouldNotify: 'RESERVATION_NOTIFICATION',
  shouldRedirect: 'RESERVATION_REDIRECT',
};

const reservationErrorAction = new ErrorActionRegistry<
  ReservationErrorAction,
  SendingEventsKeys
>();

class ReservationCancelErrorHandler implements ErrorActionHandler {
  handle(
    error: Partial<BaseWsErrorResponse>,
    sendingEvent: SendingEventsKeys,
    client?: Socket,
  ): void {
    const localError: BaseWsErrorResponse = {
      ...error,
      message: error.message ?? 'Error de reserva',
      error: error.error ?? true,
      reason: reservationErrorReason.shouldCancel,
    };
    if (client) {
      client.emit(sendingEvent, localError);
      // Desconectar con una razón específica
      client.disconnect(true); // Forzar desconexión
    }
    Logger.warn(
      'ReservationCancelErrorHandler: ' + (error.message ?? 'Error de reserva'),
      'WS_ERROR',
    );
  }
}

class ReservationNotifyErrorHandler implements ErrorActionHandler {
  handle(
    error: Partial<BaseWsErrorResponse>,
    sendingEvent: SendingEventsKeys,
    client?: Socket,
  ): void {
    const localError: BaseWsErrorResponse = {
      ...error,
      message: error.message ?? 'Error de reserva',
      error: error.error ?? true,
      reason: reservationErrorReason.shouldNotify,
    };
    if (client) {
      client.emit(sendingEvent, localError);
    }
    Logger.warn(
      'ReservationNotifyErrorHandler: ' + (error.message ?? 'Error de reserva'),
      'WS_ERROR',
    );
  }
}

class ReservationRedirectErrorHandler implements ErrorActionHandler {
  handle(
    error: Partial<BaseWsErrorResponse>,
    sendingEvent: SendingEventsKeys,
    client?: Socket,
  ): void {
    const localError: BaseWsErrorResponse = {
      ...error,
      message: error.message ?? 'Error de reserva',
      error: error.error ?? true,
      reason: reservationErrorReason.shouldRedirect,
    };
    if (client) {
      client.emit(sendingEvent, localError);
    }
    Logger.warn(
      'ReservationRedirectErrorHandler: ' +
        (error.message ?? 'Error de reserva'),
      'WS_ERROR',
    );
  }
}

const reservationCancelErrorHandler = new ReservationCancelErrorHandler();
const reservationNotifyErrorHandler = new ReservationNotifyErrorHandler();
const reservationRedirectErrorHandler = new ReservationRedirectErrorHandler();

reservationErrorAction.register('shouldCancel', reservationCancelErrorHandler);
reservationErrorAction.register('shouldNotify', reservationNotifyErrorHandler);
reservationErrorAction.register(
  'shouldRedirect',
  reservationRedirectErrorHandler,
);

export { reservationErrorAction, type ReservationErrorAction };
