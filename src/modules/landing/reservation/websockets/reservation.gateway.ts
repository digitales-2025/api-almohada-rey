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

@WebSocketGateway()
export class ReservationGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  // Aquí puedes agregar métodos para manejar eventos de WebSocket
  // como conexión, desconexión, mensajes, etc.
  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    Logger.log(`Client connected: ${client.id}`, 'ReservationGateway');
    this.server.emit(sendingEvents.onConnection, {
      message: reservationWsMessagesDictionary.onConnection.es,
      clientId: client.id,
    });
  }

  handleDisconnect(client: Socket) {
    this.server.emit(sendingEvents.onDisconnection, {
      message: reservationWsMessagesDictionary.onDisconnection.es,
      clientId: client.id,
    });
  }

  @SubscribeMessage(listeningEvents.startBookingPayment)
  handleStartBookingPayment(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: BaseI18nWsRequest,
  ) {
    try {
      if (!validateClientId(payload.clientId, client)) {
        throw new Error(
          validationMessagesDictionary.invalidClientSocketId[payload.locale],
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
  handleCancelBookingPayment(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: BaseI18nWsRequest,
  ) {
    try {
      if (!validateClientId(payload.clientId, client)) {
        throw new Error(
          validationMessagesDictionary.invalidClientSocketId[payload.locale],
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
  handleCompleteBookingPayment(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: BaseI18nWsRequest,
  ) {
    try {
      this.server.emit(sendingEvents.onCompleteBookingPayment, {
        clientId: client.id,
        data: payload,
        message:
          reservationWsMessagesDictionary.onCompleteBookingPayment[
            payload.locale
          ],
      });
      if (!validateClientId(payload.clientId, client)) {
        throw new Error(
          validationMessagesDictionary.invalidClientSocketId[payload.locale],
        );
      }
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
}
