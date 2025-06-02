import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  // OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { BaseI18nWsRequest } from 'src/websockets/dto/base-i18nRequest.dto';
import { listeningEvents, sendingEvents } from './ws.types';
import {
  reservationWsMessagesDictionary,
  validationMessagesDictionary,
} from './reservation.ws.dictionary';
import {
  validateClientId,
  withErrorAction,
} from 'src/utils/websockets/utils.ws';
import { Logger } from '@nestjs/common';
import { LandingReservationService } from '../reservation.service';
import { BaseReservationWsActionsDto } from '../dto/reservation-ws.dto';
import { ReservationStateFactory } from 'src/modules/admin/reservation/states';
import { Reservation } from 'src/modules/admin/reservation/entities/reservation.entity';
import { ReservationStatus } from '@prisma/client';
import {
  OnConnectionResponse,
  StartBookingReservationResponseDto,
} from './reservation.ws.dto';
import { HeartbeatService } from './reservation.heartbeat.service';
import {
  reservationErrorAction,
  ReservationErrorAction,
  reservationErrorActions,
} from './reservation.error-handler';
import { defaultLocale, SupportedLocales } from '../../i18n/translations';

@WebSocketGateway()
export class ReservationGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly landingReservationService: LandingReservationService,
    private readonly reservationStateFactory: ReservationStateFactory,
    private readonly heartbeatService: HeartbeatService,
  ) {}

  // afterInit(server: Server) {
  //   Logger.log('WebSocket Gateway inicializado', 'ReservationGateway');
  // }

  // Implementamos el método de la interfaz OnGatewayConnection
  async handleConnection(client: Socket) {
    Logger.log(`Cliente conectado: ${client.id}`, 'ReservationGateway');

    try {
      const reservationId = client.handshake.query.reservationId as string;
      const locale = client.handshake.query.locale as SupportedLocales;

      if (!reservationId) {
        // Añadir cliente sin reservationId
        this.heartbeatService.addClient(client, undefined, undefined);
        return;
      }

      // Si hay un ID de reserva, verificar si está disponible
      const isAvailable = this.heartbeatService.registerReservation(
        client.id,
        reservationId,
      );

      if (!isAvailable) {
        const errorMessage = withErrorAction<ReservationErrorAction>(
          validationMessagesDictionary.reservationAlreadyInUse[
            locale ?? defaultLocale
          ],
          'shouldRedirect',
        );
        throw new Error(errorMessage);
      }

      const reservation =
        await this.landingReservationService.CheckDetailedReservationExists(
          reservationId,
        );
      if (!reservation) {
        const errorDetail =
          validationMessagesDictionary.noReservationFound[
            locale ?? defaultLocale
          ];
        const errorMessage = withErrorAction<ReservationErrorAction>(
          errorDetail,
          'shouldRedirect',
        );
        throw new Error(errorMessage);
      }

      // Añadir cliente con reservationId
      this.heartbeatService.addClient(client, reservationId, locale);

      // Configurar evento para manejar pongs
      const pongListener = () => {
        this.heartbeatService.updateClientPing(client.id);
      };
      client.on(listeningEvents.pong, pongListener);

      // Limpiar el listener al desconectar
      client.once('disconnect', () => {
        client.off(listeningEvents.pong, pongListener);
      });

      const body: OnConnectionResponse = {
        clientId: client.id,
        data: {
          reservation,
        },
        message:
          reservationWsMessagesDictionary.onConnection[locale ?? defaultLocale],
        timestamp: new Date().toISOString(),
      };

      // Notificar sobre la conexión
      this.server.emit(sendingEvents.onConnection, body);
    } catch (error) {
      if (error instanceof Error) {
        return reservationErrorAction.handle(
          error.message,
          reservationErrorActions,
          sendingEvents.onErrorBookingPayment,
          client,
        );
      }
    }
  }

  // Implementamos el método de la interfaz OnGatewayDisconnect
  handleDisconnect(client: Socket) {
    Logger.log(`Cliente desconectado: ${client.id}`, 'ReservationGateway');

    // Limpiar el cliente del servicio de heartbeat
    this.heartbeatService.removeClient(client.id);

    // Notificar sobre la desconexión
    this.server.emit('clientDisconnected', {
      message: reservationWsMessagesDictionary.onDisconnection.es,
      clientId: client.id,
    });
  }

  @SubscribeMessage(listeningEvents.startBookingPayment)
  async handleStartBookingPayment(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: BaseReservationWsActionsDto,
  ) {
    try {
      const reservation = await this.executeBasicValidation(client, payload);
      const timeLimit = 12000;

      // Logger.log(reservation, 'ReservationGateway');

      if (
        !this.reservationStateFactory.getAvailableActions(reservation.status)
          .canConfirm
      ) {
        const errorMessage = withErrorAction<ReservationErrorAction>(
          validationMessagesDictionary.noValidReservationStatus[payload.locale],
          'shouldCancel',
        );
        throw new Error(errorMessage);
      }

      const response: StartBookingReservationResponseDto = {
        clientId: client.id,
        message:
          reservationWsMessagesDictionary.onStartBookingPayment[payload.locale],
        data: {
          ...payload,
          timeLimit,
        },
      };

      this.server.emit(sendingEvents.onStartBookingPayment, response);
    } catch (error) {
      // const errorResponse: BaseWsErrorResponse = {
      //   clientId: client.id,
      //   message: error.message,
      //   error: true,
      //   reason: reservationErrorReason.shouldCancel,
      //   // reason: reservationErrorReason.
      // };

      // this.server.emit(sendingEvents.onStartBookingPayment, errorResponse);

      reservationErrorAction.handle(
        error.message,
        reservationErrorActions,
        sendingEvents.onStartBookingPayment,
        client,
      );
    }
  }

  @SubscribeMessage(listeningEvents.cancelBookingPayment)
  async handleCancelBookingPayment(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: BaseReservationWsActionsDto,
  ) {
    try {
      const reservation = await this.executeBasicValidation(client, payload);

      if (
        !this.reservationStateFactory.getAvailableActions(reservation.status)
          .canCancel
      ) {
        throw new Error(
          validationMessagesDictionary.noValidReservationStatus[payload.locale],
        );
      }

      const cancelResponse =
        await this.landingReservationService.cancelReservation(
          payload.reservationId,
          payload.locale,
        );

      if (!cancelResponse || !cancelResponse.success) {
        throw new Error(
          validationMessagesDictionary.cancelReservationException[
            payload.locale
          ],
        );
      }

      const updatedReservation = cancelResponse.data;

      this.validateStatusChange(
        reservation,
        updatedReservation,
        payload.locale,
      );

      if (updatedReservation.status !== ReservationStatus.CANCELED) {
        throw new Error(
          validationMessagesDictionary.cancelReservationException[
            payload.locale
          ],
        );
      }

      this.server.emit(sendingEvents.onCancelBookingPayment, {
        clientId: client.id,
        message:
          reservationWsMessagesDictionary.onCancelBookingPayment[
            payload.locale
          ],
      });
    } catch (error) {
      // this.server.emit(sendingEvents.onCancelBookingPayment, {
      //   clientId: client.id,
      //   message: error.message,
      //   error: true,
      // });
      reservationErrorAction.handle(
        error.message,
        reservationErrorActions,
        sendingEvents.onCancelBookingPayment,
        client,
      );
    }
  }

  @SubscribeMessage(listeningEvents.completeBookingPayment)
  async handleCompleteBookingPayment(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: BaseReservationWsActionsDto,
  ) {
    try {
      const reservation = await this.executeBasicValidation(client, payload);

      if (
        !this.reservationStateFactory.getAvailableActions(reservation.status)
          .canConfirm
      ) {
        throw new Error(
          validationMessagesDictionary.noValidReservationStatus[payload.locale],
        );
      }

      const confirmReservation =
        await this.landingReservationService.confirmReservation(
          payload.reservationId,
          payload.locale,
        );

      if (!confirmReservation || !confirmReservation.success) {
        throw new Error(
          validationMessagesDictionary.confirmReservationException[
            payload.locale
          ],
        );
      }

      const updatedReservation = confirmReservation.data;
      this.validateStatusChange(
        reservation,
        updatedReservation,
        payload.locale,
      );

      if (updatedReservation.status !== ReservationStatus.CONFIRMED) {
        throw new Error(
          validationMessagesDictionary.confirmReservationException[
            payload.locale
          ],
        );
      }

      this.server.emit(sendingEvents.onCompleteBookingPayment, {
        clientId: client.id,
        data: payload,
        message:
          reservationWsMessagesDictionary.onCompleteBookingPayment[
            payload.locale
          ],
      });
    } catch (error) {
      // this.server.emit(sendingEvents.onCompleteBookingPayment, {
      //   clientId: client.id,
      //   message: error.message,
      //   error: true,
      // });
      reservationErrorAction.handle(
        error.message,
        reservationErrorActions,
        sendingEvents.onCompleteBookingPayment,
        client,
      );
    }
  }

  @SubscribeMessage(listeningEvents.errorBookingPayment)
  handleErrorBookingPayment(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: BaseI18nWsRequest,
  ) {
    try {
      if (!validateClientId(payload.clientId, client)) {
        throw new Error(
          validationMessagesDictionary.invalidClientSocketId[payload.locale],
        );
      }
      this.server.emit(sendingEvents.onErrorBookingPayment, {
        clientId: client.id,
        data: payload,
        message:
          reservationWsMessagesDictionary.onErrorBookingPayment[payload.locale],
      });
    } catch (error) {
      // this.server.emit(sendingEvents.onErrorBookingPayment, {
      //   clientId: client.id,
      //   message: error.message,
      //   error: true,
      // });
      reservationErrorAction.handle(
        error.message,
        reservationErrorActions,
        sendingEvents.onErrorBookingPayment,
        client,
      );
    }
  }

  private async executeBasicValidation(
    client: Socket,
    payload: BaseReservationWsActionsDto,
  ) {
    if (!validateClientId(payload.clientId, client)) {
      const errorDetail =
        validationMessagesDictionary.invalidClientSocketId[payload.locale];
      const errorMessage = withErrorAction<ReservationErrorAction>(
        errorDetail,
        'shouldRedirect',
      );
      throw new Error(errorMessage);
    }

    if (!payload.reservationId) {
      const errorDetail =
        validationMessagesDictionary.missingReservationId[payload.locale];
      const errorMessage = withErrorAction<ReservationErrorAction>(
        errorDetail,
        'shouldRedirect',
      );
      throw new Error(errorMessage);
    }

    // *** CONTROL DE CONCURRENCIA ***
    // Verificar si el socket tiene acceso exclusivo a esta reserva
    const hasAccess = this.heartbeatService.registerReservation(
      client.id,
      payload.reservationId,
    );

    if (!hasAccess) {
      const errorDetail =
        validationMessagesDictionary.reservationAlreadyInUse[payload.locale];
      const errorMessage = withErrorAction<ReservationErrorAction>(
        errorDetail,
        'shouldRedirect',
      );
      throw new Error(errorMessage);
    }

    const reservation =
      await this.landingReservationService.checkReservationExists(
        payload.reservationId,
      );
    if (!reservation) {
      const errorDetail =
        validationMessagesDictionary.noReservationFound[payload.locale];
      const errorMessage = withErrorAction<ReservationErrorAction>(
        errorDetail,
        'shouldRedirect',
      );
      throw new Error(errorMessage);
    }

    return reservation;
  }

  private validateStatusChange(
    ogReservation: Reservation,
    updatedReservation: Reservation,
    locale: string,
  ) {
    // const availableActions = this.reservationStateFactory.getAvailableActions(
    //   ogReservation.status,
    // );
    if (ogReservation.status !== updatedReservation.status) {
      return true;
    } else {
      throw new Error(
        validationMessagesDictionary.updateReservationException[locale],
      );
    }
  }

  // @SubscribeMessage(listeningEvents.pong)
  // handlePong(@ConnectedSocket() client: Socket) {
  //   this.heartbeatService.updateClientPing(client.id);
  // }
}
