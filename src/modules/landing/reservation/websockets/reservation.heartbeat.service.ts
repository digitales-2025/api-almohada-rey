import { Injectable, Logger } from '@nestjs/common';
import { Socket } from 'socket.io';
import {
  ReservationErrorAction,
  reservationErrorAction,
  reservationErrorActions,
} from './reservation.error-handler';
import { withErrorAction } from 'src/utils/websockets/utils.ws';
import { sendingEvents } from './ws.types';
import { validationMessagesDictionary } from './reservation.ws.dictionary';
import { defaultLocale, SupportedLocales } from '../../i18n/translations';

export type HeartbeatClient = {
  socket: Socket;
  lastPing: number;
  interval: NodeJS.Timeout;
  reservationId: string | undefined;
  locale: SupportedLocales | undefined;
};

@Injectable()
export class HeartbeatService {
  readonly clients = new Map<string, HeartbeatClient>();
  readonly reservationSockets = new Map<string, string>();

  private readonly HEARTBEAT_INTERVAL = 10000; // 10 segundos
  private readonly MISSED_BEATS_TO_WARNING = 1; // Avisar después de perder 1 heartbeat
  private readonly MAX_MISSED_BEATS = 2; // Desconectar después de perder 2 heartbeats

  constructor() {}

  // register(server: Server): void {
  //   // Configurar el evento para escuchar nuevas conexiones
  //   server.on(sendingEvents.onConnection, (socket: Socket) => {
  //     const reservationId = socket.handshake.query.reservationId as string;
  //     const locale = socket.handshake.query.locale as SupportedLocales;
  //     // this.addClient(socket);
  //     if (reservationId) {
  //       // Si hay un ID de reserva, verificar si está disponible
  //       const isAvailable = this.registerReservation(socket.id, reservationId);

  //       if (!isAvailable) {
  //         // Si la reserva ya está en uso, rechazar la conexión
  //         // const errorDetail = `La reserva ${reservationId} ya está siendo gestionada por otro usuario`;
  //         const errorMessage = withErrorAction(
  //           validationMessagesDictionary.reservationAlreadyInUse[
  //             locale ?? defaultLocale
  //           ],
  //           'shouldRedirect',
  //         );

  //         // socket.emit('error:notification', {
  //         //   message: errorDetail,
  //         //   reason: 'reservationAlreadyInUse',
  //         //   timestamp: new Date().toISOString(),
  //         // });

  //         reservationErrorAction.handle(
  //           errorMessage,
  //           reservationErrorActions,
  //           sendingEvents.onErrorBookingPayment,
  //           socket,
  //         );

  //         // Desconectar al cliente
  //         socket.disconnect(true);
  //         return;
  //       }

  //       // Añadir cliente con reservationId
  //       this.addClient(socket, reservationId, locale);
  //     } else {
  //       // Añadir cliente sin reservationId
  //       this.addClient(socket, undefined, undefined);
  //     }

  //     socket.on(sendingEvents.onPong, () => {
  //       this.updateClientPing(socket.id);
  //     });

  //     socket.on(sendingEvents.onDisconnection, () => {
  //       this.removeClient(socket.id);
  //     });
  //   });
  // }

  // register(server: Server): void {
  //   // Ya no configuramos el evento para escuchar nuevas conexiones aquí
  //   // Esa responsabilidad ahora pertenece al ReservationGateway

  //   // Solo realizamos la configuración inicial del servicio si es necesaria
  //   Logger.log('HeartbeatService iniciado', 'HeartbeatService');
  // }

  // Registra un socket como gestor de una reserva
  registerReservation(socketId: string, reservationId: string): boolean {
    const existingSocketId = this.reservationSockets.get(reservationId);

    // Si el mismo socket ya estaba asociado, todo bien
    if (existingSocketId === socketId) {
      return true;
    }

    // Si ya hay otro socket asociado a esta reserva, rechazar
    if (existingSocketId) {
      Logger.warn(
        `Socket ${socketId} intentó acceder a reserva ${reservationId} ya en uso por ${existingSocketId}`,
        'HeartbeatService',
      );
      return false;
    }

    // Registrar la nueva asociación
    this.reservationSockets.set(reservationId, socketId);

    // Actualizar el objeto client
    const client = this.clients.get(socketId);
    if (client) {
      client.reservationId = reservationId;
    }

    Logger.log(
      `Socket ${socketId} registrado para reserva ${reservationId}`,
      'HeartbeatService',
    );

    return true;
  }

  addClient(
    socket: Socket,
    reservationId: string | undefined,
    locale: SupportedLocales | undefined,
  ): void {
    // Guardar el cliente
    this.clients.set(socket.id, {
      socket,
      lastPing: Date.now(),
      interval: setInterval(
        () => this.checkClientConnection(socket.id),
        this.HEARTBEAT_INTERVAL,
      ),
      reservationId,
      locale,
    });

    // Enviar primer ping inmediatamente
    socket.emit(sendingEvents.ping);
  }

  updateClientPing(clientId: string): void {
    const client = this.clients.get(clientId);
    if (client) {
      client.lastPing = Date.now();
    }
  }

  checkClientConnection(clientId: string): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    const now = Date.now();
    const elapsed = now - client.lastPing;

    if (elapsed > this.HEARTBEAT_INTERVAL * this.MISSED_BEATS_TO_WARNING) {
      Logger.warn(
        `Cliente ${clientId} no responde a heartbeat. Esperando...`,
        'WSHeartbeatService',
      );
      const errorMessage = withErrorAction<ReservationErrorAction>(
        validationMessagesDictionary.unstableConnection[
          client.locale ?? defaultLocale
        ],
        'shouldNotify',
      );

      reservationErrorAction.handle(
        errorMessage,
        reservationErrorActions,
        sendingEvents.onPong,
        client.socket,
      );
    }
    // Si el cliente no responde después de 2 intervalos, desconectar

    if (elapsed > this.HEARTBEAT_INTERVAL * this.MAX_MISSED_BEATS) {
      Logger.warn(
        `Cliente ${clientId} no responde a heartbeat. Desconectando...`,
        'WSHeartbeatService',
      );

      // Usar el sistema de manejo de errores existente
      const errorMessage = withErrorAction<ReservationErrorAction>(
        validationMessagesDictionary.unstableConnection[
          client.locale ?? defaultLocale
        ],
        'shouldCancel',
      );

      reservationErrorAction.handle(
        errorMessage,
        reservationErrorActions,
        sendingEvents.onNoPing,
        client.socket,
      );

      // Eliminar cliente después de manejar el error
      this.removeClient(clientId);
    } else {
      // Enviar ping
      client.socket.emit(sendingEvents.ping);
    }
  }

  removeClient(clientId: string): void {
    const client = this.clients.get(clientId);
    if (client) {
      clearInterval(client.interval);
      if (client.reservationId) {
        this.reservationSockets.delete(client.reservationId);
        Logger.log(
          `Reserva ${client.reservationId} liberada al desconectar socket ${clientId}`,
          'HeartbeatService',
        );
      }
      this.clients.delete(clientId);
    }
  }
}
