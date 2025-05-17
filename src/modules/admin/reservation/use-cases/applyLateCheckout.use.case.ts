import {
  Injectable,
  BadRequestException,
  Logger,
  ConflictException,
} from '@nestjs/common';
import { UserData } from 'src/interfaces';
import { AuditActionType, ReservationStatus } from '@prisma/client';
import { BaseApiResponse } from 'src/utils/base-response/BaseApiResponse.dto';
import { Reservation } from '../entities/reservation.entity';
import { ReservationRepository } from '../repository/reservation.repository';
import { AuditRepository } from '../../audit/audit.repository';

@Injectable()
export class ApplyLateCheckoutUseCase {
  private readonly logger = new Logger(ApplyLateCheckoutUseCase.name);

  constructor(
    private readonly reservationRepository: ReservationRepository,
    private readonly auditRepository: AuditRepository,
  ) {}

  async execute(
    reservationId: string,
    newCheckoutTime: string,
    user: UserData,
  ): Promise<BaseApiResponse<Reservation>> {
    try {
      this.logger.log(
        `Ejecutando caso de uso para aplicar late checkout a la reserva ${reservationId} con hora ${newCheckoutTime}`,
      );

      // Validar formato de hora (HH:mm)
      const timeRegex = /^([01]?[0-9]|2[0-3]):([0-5][0-9])$/;
      if (!timeRegex.test(newCheckoutTime)) {
        throw new BadRequestException(
          'El formato de la nueva hora de checkout debe ser HH:mm',
        );
      }

      // Ejecutar toda la lógica de late checkout dentro de una transacción
      return await this.reservationRepository.transaction(
        async (tx) => {
          // Obtener la reserva original dentro de la transacción
          const reservation = await this.reservationRepository.findByIdWithTx(
            reservationId,
            tx,
          );

          if (!reservation) {
            throw new BadRequestException(
              `No se encontró la reserva con ID ${reservationId}`,
            );
          }

          // Solo permitir Late Checkout para reservas CONFIRMED o CHECKED_IN
          if (
            reservation.status !== ReservationStatus.CONFIRMED &&
            reservation.status !== ReservationStatus.CHECKED_IN
          ) {
            throw new BadRequestException(
              `No se puede aplicar Late Checkout a una reserva con estado ${reservation.status}`,
            );
          }

          // Extraer fecha de checkout original
          const originalCheckoutDate = new Date(reservation.checkOutDate);

          // Parsear la nueva hora
          const [hours, minutes] = newCheckoutTime.split(':').map(Number);

          // Crear una nueva fecha con la misma fecha pero diferente hora
          const newCheckoutDate = new Date(originalCheckoutDate);
          newCheckoutDate.setHours(hours, minutes, 0, 0);

          // Validar que la nueva hora es posterior a la hora original
          if (newCheckoutDate <= originalCheckoutDate) {
            throw new BadRequestException(
              'La nueva hora de checkout debe ser posterior a la hora original',
            );
          }

          // Validar que no haya otra reserva el mismo día para esa habitación
          // o el día siguiente si el late checkout se extiende más allá de medianoche
          const sameDay = new Date(originalCheckoutDate);
          sameDay.setHours(0, 0, 0, 0);

          const nextDay = new Date(sameDay);
          nextDay.setDate(nextDay.getDate() + 1);

          // Buscar reservas que puedan entrar en conflicto
          const conflictingReservations =
            await this.reservationRepository.findManyWithTx(
              {
                where: {
                  id: { not: reservationId },
                  roomId: reservation.roomId,
                  isActive: true,
                  status: {
                    in: [
                      ReservationStatus.PENDING,
                      ReservationStatus.CONFIRMED,
                      ReservationStatus.CHECKED_IN,
                    ],
                  },
                  // Buscar reservas que podrían superponerse con el nuevo checkout
                  OR: [
                    // Reservas que comienzan el mismo día
                    {
                      checkInDate: {
                        gte: sameDay,
                        lt: nextDay,
                        lte: newCheckoutDate, // Su check-in es antes que nuestro nuevo checkout
                      },
                    },
                    // Reservas que comienzan el día siguiente pero antes de la nueva hora de checkout
                    // (si el late checkout se extiende hasta el día siguiente)
                    {
                      checkInDate: {
                        gte: nextDay,
                        lt: newCheckoutDate, // Solo si el nuevo checkout es después de medianoche
                      },
                    },
                  ],
                },
                select: {
                  id: true,
                  checkInDate: true,
                  status: true,
                },
                orderBy: { checkInDate: 'asc' }, // Ordenar por fecha de entrada
              },
              tx,
            );

          if (conflictingReservations.length > 0) {
            // Proporcionar información detallada sobre el conflicto
            const nextReservation = conflictingReservations[0];
            const nextCheckInTime = new Date(
              nextReservation.checkInDate,
            ).toLocaleTimeString('es-ES', {
              hour: '2-digit',
              minute: '2-digit',
            });

            const formattedDate = new Date(
              nextReservation.checkInDate,
            ).toLocaleDateString('es-ES', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
            });

            throw new ConflictException(
              `No se puede aplicar Late Checkout porque hay otra reserva programada para la misma habitación el ${formattedDate} a las ${nextCheckInTime}`,
            );
          }

          // Todo está validado, actualizar la reserva con la nueva hora
          const updated = await this.reservationRepository.updateWithTx(
            reservationId,
            {
              checkOutDate: newCheckoutDate.toISOString(), // Convertir a string ISO
              updatedAt: new Date(),
            },
            tx,
          );

          // Registrar auditoría
          await this.auditRepository.createWithTx(
            {
              entityId: updated.id,
              entityType: 'reservation',
              action: AuditActionType.UPDATE,
              performedById: user.id,
            },
            tx,
          );

          // Registrar en el log para auditoría y seguimiento
          this.logger.log(
            `Late checkout aplicado para la reserva ${reservationId}. Hora original: ${originalCheckoutDate.toLocaleTimeString()}, Nueva hora: ${newCheckoutTime}`,
            {
              userId: user.id,
              originalTime: originalCheckoutDate.toLocaleTimeString(),
              newTime: newCheckoutTime,
            },
          );

          return {
            data: updated,
            message: `Late checkout aplicado correctamente. Nueva hora de salida: ${newCheckoutTime}`,
            success: true,
          };
        },
        { isolationLevel: 'Serializable' }, // Usar nivel de aislamiento Serializable
      );
    } catch (error) {
      this.logger.error(`Error al aplicar late checkout: ${error.message}`, {
        error,
        reservationId,
        newCheckoutTime,
      });
      throw error; // Dejar que el servicio maneje el error
    }
  }
}
