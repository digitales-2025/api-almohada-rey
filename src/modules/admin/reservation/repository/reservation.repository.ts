import { Injectable } from '@nestjs/common';
import { BaseRepository } from 'src/prisma/src/abstract/base.repository';
import { Reservation } from '../entities/reservation.entity';
import { PrismaService } from 'src/prisma/prisma.service';
import { ReservationStatus, RoomStatus } from '@prisma/client';

@Injectable()
export class ReservationRepository extends BaseRepository<Reservation> {
  constructor(prisma: PrismaService) {
    super(prisma, 'reservation');
  }

  /**
   * Verifica si una habitación está disponible para un rango de fechas específico
   * @param roomId - ID de la habitación a verificar
   * @param checkInDate - Fecha de entrada solicitada
   * @param checkOutDate - Fecha de salida solicitada
   * @returns true si está disponible, false si no lo está
   */
  async checkRoomAvailability(
    roomId: string,
    checkInDate: Date,
    checkOutDate: Date,
    forUpdate: boolean = false,
    reservationId?: string,
  ): Promise<boolean> {
    // Buscamos reservaciones existentes que se superpongan con las fechas solicitadas
    // y que estén en estados que impliquen que la habitación está ocupada
    const overlappingReservations = await this.prisma.reservation.count({
      where: {
        roomId,
        isActive: true,
        // Solo considerar reservaciones activas o confirmadas
        status: {
          in: [
            ReservationStatus.CHECKED_IN, // Reservaciones Activas, el cliente ya está en la habitación
            ReservationStatus.PENDING, //This is when was reserved, but not payed yet
            ReservationStatus.CONFIRMED, // Reservaciones Confirmadas
          ],
        },
        // Excluye la reserva actual si forUpdate es true
        ...(forUpdate && reservationId ? { id: { not: reservationId } } : {}),
        // Verificar superposición de fechas
        OR: [
          // Caso 1: La fecha de check-in solicitada está dentro de una reserva existente
          {
            checkInDate: { lte: checkInDate },
            checkOutDate: { gt: checkInDate },
          },
          // Caso 2: La fecha de check-out solicitada está dentro de una reserva existente
          {
            checkInDate: { lt: checkOutDate },
            checkOutDate: { gte: checkOutDate },
          },
          // Caso 3: Las fechas solicitadas envuelven completamente a una reserva existente
          {
            checkInDate: { gte: checkInDate },
            checkOutDate: { lte: checkOutDate },
          },
        ],
      },
    });

    // if (forUpdate && reservationId) {
    //   // Si estamos actualizando una reservación, excluimos esa reservación de la verificación
    //   const reservation = await this.prisma.reservation.findUnique({
    //     where: { id: reservationId },
    //     select: { roomId: true },
    //   });

    //   if (reservation && reservation.roomId === roomId) {
    //     // Logger.log(
    //     //   `Reservation room ID: ${reservation.roomId} - Room ID: ${roomId} - Overlapping Reservations: ${overlappingReservations}`,
    //     //   'ReservationRepository',
    //     // );
    //     // Logger.log(
    //     //   'Validation overlapping' + `${overlappingReservations === 0}`,
    //     // );
    //     return overlappingReservations === 1;
    //   }
    // }

    // Si no hay reservaciones superpuestas, la habitación está disponible
    return overlappingReservations === 0;
  }

  async checkCurrentRoomAvailability(roomId: string): Promise<boolean> {
    const currentRoom = await this.prisma.room.findUnique({
      where: { id: roomId },
      select: { status: true },
    });

    return currentRoom.status === RoomStatus.AVAILABLE;
  }

  async getReservedRoomsIds(
    checkInDate: Date,
    checkOutDate: Date,
  ): Promise<string[]> {
    const reservations = await this.prisma.reservation.findMany({
      where: {
        isActive: true,
        status: {
          in: [
            ReservationStatus.CHECKED_IN, // Reservaciones Activas, el cliente ya está en la habitación
            ReservationStatus.PENDING, //This is when was reserved, but not payed yet
            ReservationStatus.CONFIRMED, // Reservaciones Confirmadas
          ],
        },
        OR: [
          {
            checkInDate: { lte: checkInDate },
            checkOutDate: { gt: checkInDate },
          },
          {
            checkInDate: { lt: checkOutDate },
            checkOutDate: { gte: checkOutDate },
          },
          {
            checkInDate: { gte: checkInDate },
            checkOutDate: { lte: checkOutDate },
          },
        ],
      },
      select: { roomId: true },
    });

    return reservations.map((reservation) => reservation.roomId);
  }
}
