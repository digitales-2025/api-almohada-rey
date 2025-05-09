import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
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
import { validateClientId } from 'src/utils/websockets/utils.ws';
import { Logger } from '@nestjs/common';
import { LandingReservationService } from '../reservation.service';
import { BaseReservationWsActionsDto } from '../dto/reservation-ws.dto';
import { ReservationStateFactory } from 'src/modules/admin/reservation/states';
import { Reservation } from 'src/modules/admin/reservation/entities/reservation.entity';
import { ReservationStatus } from '@prisma/client';

@WebSocketGateway()
export class ReservationGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  // Aquí puedes agregar métodos para manejar eventos de WebSocket
  // como conexión, desconexión, mensajes, etc.
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly landingReservationService: LandingReservationService,
    private readonly reservationStateFactory: ReservationStateFactory,
  ) {}

  handleConnection(client: Socket) {
    Logger.log(`Client connected: ${client.id}`, 'ReservationGateway');
    this.server.emit(sendingEvents.onConnection, {
      message: reservationWsMessagesDictionary.onConnection.es,
      clientId: client.id,
    });
  }

  handleDisconnect(client: Socket) {
    Logger.log(`Client disconnected: ${client.id}`, 'ReservationGateway');
    this.server.emit(sendingEvents.onDisconnection, {
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

      if (
        !this.reservationStateFactory.getAvailableActions(reservation.status)
          .canConfirm
      ) {
        throw new Error(
          validationMessagesDictionary.noValidReservationStatus[payload.locale],
        );
      }

      this.server.emit(sendingEvents.onStartBookingPayment, {
        clientId: client.id,
        message:
          reservationWsMessagesDictionary.onStartBookingPayment[payload.locale],
        data: {
          ...payload,
          timeLimit: 75,
        },
      });
    } catch (error) {
      this.server.emit(sendingEvents.onStartBookingPayment, {
        clientId: client.id,
        message: error.message,
        error: true,
      });
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
      this.server.emit(sendingEvents.onCancelBookingPayment, {
        clientId: client.id,
        message: error.message,
        error: true,
      });
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
      this.server.emit(sendingEvents.onCompleteBookingPayment, {
        clientId: client.id,
        message: error.message,
        error: true,
      });
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
      this.server.emit(sendingEvents.onErrorBookingPayment, {
        clientId: client.id,
        message: error.message,
        error: true,
      });
    }
  }

  private async executeBasicValidation(
    client: Socket,
    payload: BaseReservationWsActionsDto,
  ) {
    if (!validateClientId(payload.clientId, client)) {
      throw new Error(
        validationMessagesDictionary.invalidClientSocketId[payload.locale],
      );
    }

    if (!payload.reservationId) {
      throw new Error(
        validationMessagesDictionary.missingReservationId[payload.locale],
      );
    }

    const reservation =
      await this.landingReservationService.checkReservationExists(
        payload.reservationId,
      );
    if (!reservation) {
      throw new Error(
        validationMessagesDictionary.noReservationFound[payload.locale],
      );
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
}
