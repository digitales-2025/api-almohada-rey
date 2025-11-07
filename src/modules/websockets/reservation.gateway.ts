import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { DetailedReservation } from '../../modules/admin/reservation/entities/reservation.entity';
import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { generalEnvs } from 'src/config';
import { ReservationService } from '../admin/reservation/reservation.service';

@Injectable()
@WebSocketGateway(Number(generalEnvs.WEBSOCKET_PORT) || 5000, {
  cors: {
    origin: [generalEnvs.WEB_URL],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Origin',
      'X-Requested-With',
      'Content-Type',
      'Accept',
      'Authorization',
    ],
  },
  namespace: '/reservations',
  path: '/socket.io',
})
export class ReservationGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(ReservationGateway.name);

  @WebSocketServer()
  server: Server;

  constructor(
    @Inject(forwardRef(() => ReservationService))
    private readonly reservationService: ReservationService,
  ) {}

  handleConnection(client: Socket) {
    this.logger.log(`✅ [GATEWAY] Cliente conectado: ${client.id}`, {
      socketId: client.id,
      namespace: client.nsp.name,
      transport: client.conn.transport.name,
      remoteAddress: client.handshake.address,
      userAgent: client.handshake.headers['user-agent'],
      origin: client.handshake.headers.origin,
      timestamp: new Date().toISOString(),
    });
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`❌ [GATEWAY] Cliente desconectado: ${client.id}`, {
      socketId: client.id,
      namespace: client.nsp.name,
      timestamp: new Date().toISOString(),
    });
  }

  // Método para emitir actualizaciones de reservaciones
  emitReservationUpdate(reservation: DetailedReservation) {
    const clientCount = this.server.sockets.sockets.size;
    this.logger.log(
      `📤 [GATEWAY] Emitiendo actualización de reservación: ${reservation.id}`,
      {
        reservationId: reservation.id,
        event: 'reservationUpdated',
        connectedClients: clientCount,
        timestamp: new Date().toISOString(),
      },
    );
    this.server.emit('reservationUpdated', reservation);
  }

  // Método para emitir nuevas reservaciones
  emitNewReservation(reservation: DetailedReservation) {
    const clientCount = this.server.sockets.sockets.size;
    this.logger.log(
      `📤 [GATEWAY] Emitiendo nueva reservación: ${reservation.id}`,
      {
        reservationId: reservation.id,
        event: 'newReservation',
        connectedClients: clientCount,
        timestamp: new Date().toISOString(),
      },
    );
    this.server.emit('newReservation', reservation);
  }

  // Método para emitir cuando una reservación es eliminada
  emitReservationDeleted(reservationId: string) {
    const clientCount = this.server.sockets.sockets.size;
    this.logger.log(
      `📤 [GATEWAY] Emitiendo eliminación de reservación: ${reservationId}`,
      {
        reservationId,
        event: 'reservationDeleted',
        connectedClients: clientCount,
        timestamp: new Date().toISOString(),
      },
    );
    this.server.emit('reservationDeleted', { id: reservationId });
  }

  // Método para emitir cuando cambia la disponibilidad de habitaciones
  emitAvailabilityChange(checkInDate: string, checkOutDate: string) {
    const clientCount = this.server.sockets.sockets.size;
    this.logger.log(
      `📤 [GATEWAY] Emitiendo cambio de disponibilidad para el período: ${checkInDate} - ${checkOutDate}`,
      {
        checkInDate,
        checkOutDate,
        event: 'availabilityChanged',
        connectedClients: clientCount,
        timestamp: new Date().toISOString(),
      },
    );
    this.server.emit('availabilityChanged', { checkInDate, checkOutDate });
  }

  // Método para emitir cuando se verifica disponibilidad de una habitación
  emitRoomAvailabilityChecked(
    roomId: string,
    checkInDate: string,
    checkOutDate: string,
    isAvailable: boolean,
  ) {
    this.logger.log(
      `Emitiendo verificación de disponibilidad para habitación ${roomId}: ${isAvailable ? 'disponible' : 'no disponible'}`,
    );
    this.server.emit('roomAvailabilityChecked', {
      roomId,
      checkInDate,
      checkOutDate,
      isAvailable,
      timestamp: new Date().toISOString(),
    });
  }

  emitReservationsInInterval(
    checkInDate: string,
    checkOutDate: string,
    reservations: DetailedReservation[],
  ) {
    this.logger.log(
      `Emitiendo listado de ${reservations.length} reservaciones en intervalo: ${checkInDate} - ${checkOutDate}`,
    );
    this.server.emit('reservationsInInterval', {
      checkInDate,
      checkOutDate,
      reservations,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Emite un evento cuando se verifica la disponibilidad para modificar el checkout de una reserva
   * @param roomId ID de la habitación
   * @param originalCheckoutDate Fecha/hora original de checkout
   * @param newCheckoutDate Nueva fecha/hora de checkout propuesta
   * @param isAvailable Indica si es posible realizar el cambio
   */
  emitCheckoutAvailabilityChecked(
    roomId: string,
    originalCheckoutDate: string,
    newCheckoutDate: string,
    isAvailable: boolean,
  ): void {
    this.logger.log(
      `Emitiendo verificación de disponibilidad de checkout extendido para habitación ${roomId}: ${
        isAvailable ? 'disponible' : 'no disponible'
      }`,
    );
    this.server.emit('checkout-availability-checked', {
      roomId,
      originalCheckoutDate,
      newCheckoutDate,
      isAvailable,
      timestamp: new Date().toISOString(),
    });
  }

  // Suscripción para que un cliente solicite datos de reservaciones en un intervalo
  @SubscribeMessage('getReservationsInInterval')
  async handleGetReservationsInInterval(
    client: Socket,
    payload: { checkInDate: string; checkOutDate: string },
  ) {
    this.logger.log(
      `📥 [GATEWAY] Cliente ${client.id} solicitó reservaciones en intervalo: ${payload.checkInDate} - ${payload.checkOutDate}`,
      {
        clientId: client.id,
        checkInDate: payload.checkInDate,
        checkOutDate: payload.checkOutDate,
        timestamp: new Date().toISOString(),
      },
    );

    try {
      const reservations =
        await this.reservationService.getAllReservationsInTimeInterval(
          payload.checkInDate,
          payload.checkOutDate,
          false,
        );

      // No necesitas emitir nada aquí, ya que el método getAllReservationsInTimeInterval
      // ya emitirá el evento a todos los clientes

      // Sólo devolvemos la respuesta al cliente que hizo la solicitud
      return {
        event: 'reservationsInInterval',
        data: {
          checkInDate: payload.checkInDate,
          checkOutDate: payload.checkOutDate,
          reservations: reservations || [],
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      this.logger.error(`Error al obtener reservaciones: ${error.message}`);
      return {
        event: 'reservationsInInterval',
        data: {
          checkInDate: payload.checkInDate,
          checkOutDate: payload.checkOutDate,
          reservations: [],
          error: 'Error al obtener reservaciones',
          timestamp: new Date().toISOString(),
        },
      };
    }
  }
}
