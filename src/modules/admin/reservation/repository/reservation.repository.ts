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
   * Normaliza las razones mapeando valores inválidos a categorías válidas
   * @returns Lista de razones únicas normalizadas ordenadas alfabéticamente
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
    });

    // Mapeo de normalización para valores inválidos o variaciones
    const reasonMapping: Record<string, string> = {
      // Números y valores inválidos -> "otros"
      '0': 'otros',
      p: 'otros',
      '30402326': 'otros',
      '77325245': 'otros',

      // Variaciones de trabajo
      trabajo: 'trabajo',
      'negocios y motivos profesionales': 'trabajo',
      competencia: 'trabajo',
      compras: 'trabajo',

      // Variaciones de vacaciones
      vacaciones: 'vacaciones',
      'vacaciones/eventos': 'vacaciones',
      'vienen por vacaciones': 'vacaciones',

      // Variaciones de visitas familiares
      'visita familiares': 'visitas familiares',
      'visitas a familiares/amigos': 'visitas familiares',

      // Variaciones de educación
      educacion: 'educación',
      'educacion  y formacion': 'educación',

      // Variaciones de salud
      'salud y atencion medica': 'salud',
      calcina: 'salud', // Posible error de tipeo de "calcinación" o similar

      // Variaciones de religión
      'religion/peregrinaciones': 'religión',

      // Nombres propios -> "otros"
      ojeda: 'otros',
    };

    // Normalizar las razones
    const normalizedReasons = reasons
      .map((item) => {
        const reason = item.reason?.toLowerCase().trim();
        if (!reason || reason.length === 0) return null;

        // Si existe mapeo directo, usarlo
        if (reasonMapping[reason]) {
          return reasonMapping[reason];
        }

        // Si es un número, mapear a "otros"
        if (/^\d+$/.test(reason)) {
          return 'otros';
        }

        // Si contiene solo caracteres especiales o es muy corto, mapear a "otros"
        if (reason.length <= 2 || /^[^a-záéíóúñ\s]+$/i.test(reason)) {
          return 'otros';
        }

        // Si contiene palabras clave, mapear apropiadamente
        if (
          reason.includes('trabajo') ||
          reason.includes('negocio') ||
          reason.includes('profesional')
        ) {
          return 'trabajo';
        }
        if (
          reason.includes('vacacion') ||
          reason.includes('turismo') ||
          reason.includes('descanso')
        ) {
          return 'vacaciones';
        }
        if (
          reason.includes('familia') ||
          reason.includes('amigo') ||
          reason.includes('visita')
        ) {
          return 'visitas familiares';
        }
        if (
          reason.includes('educacion') ||
          reason.includes('formacion') ||
          reason.includes('estudio')
        ) {
          return 'educación';
        }
        if (
          reason.includes('salud') ||
          reason.includes('medic') ||
          reason.includes('hospital')
        ) {
          return 'salud';
        }
        if (
          reason.includes('religion') ||
          reason.includes('peregrinacion') ||
          reason.includes('iglesia')
        ) {
          return 'religión';
        }

        // Si no coincide con nada, mantener el valor original normalizado
        return reason;
      })
      .filter((reason) => reason && reason.length > 0);

    // Eliminar duplicados usando Set y convertir de vuelta a array
    const uniqueReasons = [...new Set(normalizedReasons)];

    // Ordenar alfabéticamente
    uniqueReasons.sort();

    return uniqueReasons.map((reason) => ({ reason }));
  }
}
