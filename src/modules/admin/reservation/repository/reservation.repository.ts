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
    tx?: any, // Parámetro para transacción
  ): Promise<boolean> {
    // Usar el cliente de transacción o el cliente normal
    const prismaClient = tx || this.prisma;

    // Condición de superposición de fechas
    const whereCondition = {
      roomId,
      isActive: true,
      // Solo considerar reservaciones activas o confirmadas
      status: {
        in: [
          ReservationStatus.CHECKED_IN,
          ReservationStatus.PENDING,
          ReservationStatus.CONFIRMED,
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
    };

    // Si queremos bloqueo pesimista y estamos dentro de una transacción
    if (forUpdate && tx) {
      // Primero hacemos findMany para obtener y bloquear los registros
      // Dentro de una transacción con nivel Serializable, esto crea un bloqueo efectivo
      const reservationsToBlock = await prismaClient.reservation.findMany({
        where: whereCondition,
        select: { id: true },
        orderBy: { id: 'asc' }, // Ordenar para prevenir deadlocks
      });

      // Devolvemos true si no hay superposiciones
      return reservationsToBlock.length === 0;
    }
    // Sin bloqueo pesimista, usamos count directamente
    else {
      const overlappingReservations = await prismaClient.reservation.count({
        where: whereCondition,
      });

      // Si no hay reservaciones superpuestas, la habitación está disponible
      return overlappingReservations === 0;
    }
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

  async getReservedReservationsIds(
    checkInDate: Date,
    checkOutDate: Date,
    roomId?: string,
  ) {
    const reservations = await this.prisma.reservation.findMany({
      where: {
        isActive: true,
        ...(roomId ? { roomId } : {}),
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
      select: { id: true },
    });

    return reservations.map((reservation) => reservation.id);
  }

  /**
   * Obtiene todas las razones únicas de las reservas activas
   * @returns Lista de razones únicas ordenadas alfabéticamente
   */
  async getAllReasons(): Promise<{ reason: string }[]> {
    const reasons = await this.prisma.reservation.findMany({
      where: {
        reason: {
          not: null,
        },
      },
      select: {
        reason: true,
      },
      distinct: ['reason'],
      orderBy: {
        reason: 'asc',
      },
    });

    return reasons
      .map((item) => ({ reason: item.reason }))
      .filter((item) => item.reason);
  }
}
