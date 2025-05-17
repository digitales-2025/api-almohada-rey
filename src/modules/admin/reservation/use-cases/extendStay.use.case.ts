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
export class ExtendStayUseCase {
  private readonly logger = new Logger(ExtendStayUseCase.name);

  constructor(
    private readonly reservationRepository: ReservationRepository,
    private readonly auditRepository: AuditRepository,
  ) {}

  async execute(
    reservationId: string,
    newCheckoutDate: string,
    user: UserData,
  ): Promise<BaseApiResponse<Reservation>> {
    try {
      this.logger.log(
        `Ejecutando caso de uso para extender estadía de la reserva ${reservationId} hasta ${newCheckoutDate}`,
      );

      // Ejecutar toda la lógica dentro de una transacción
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

          // Solo permitir extensión para reservas CONFIRMED o CHECKED_IN
          if (
            reservation.status !== ReservationStatus.CONFIRMED &&
            reservation.status !== ReservationStatus.CHECKED_IN
          ) {
            throw new BadRequestException(
              `No se puede extender la estadía de una reserva con estado ${reservation.status}`,
            );
          }

          // Convertir strings a objetos Date
          const originalCheckoutDate = new Date(reservation.checkOutDate);
          const parsedNewCheckoutDate = new Date(newCheckoutDate);

          // Validar que la nueva fecha es posterior a la original
          if (parsedNewCheckoutDate <= originalCheckoutDate) {
            throw new BadRequestException(
              'La nueva fecha de checkout debe ser posterior a la fecha original',
            );
          }

          // Validar que la nueva fecha es posterior a la fecha de check-in
          const originalCheckinDate = new Date(reservation.checkInDate);
          if (parsedNewCheckoutDate <= originalCheckinDate) {
            throw new BadRequestException(
              'La nueva fecha de checkout debe ser posterior a la fecha de check-in',
            );
          }

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
                  OR: [
                    // Caso 1: La fecha de check-in de otra reserva está dentro de nuestro nuevo período
                    {
                      checkInDate: {
                        gte: originalCheckoutDate,
                        lt: parsedNewCheckoutDate, // Entre el checkout original y el nuevo
                      },
                    },
                    // Caso 2: La fecha de check-out de otra reserva está dentro de nuestro nuevo período
                    {
                      checkOutDate: {
                        gt: originalCheckoutDate,
                        lte: parsedNewCheckoutDate,
                      },
                    },
                    // Caso 3: Otra reserva abarca completamente nuestro nuevo período
                    {
                      checkInDate: { lte: originalCheckoutDate },
                      checkOutDate: { gte: parsedNewCheckoutDate },
                    },
                  ],
                },
                select: {
                  id: true,
                  checkInDate: true,
                  status: true,
                  guestName: true,
                },
                orderBy: { checkInDate: 'asc' },
              },
              tx,
            );

          if (conflictingReservations.length > 0) {
            // Proporcionar información detallada sobre el conflicto
            const nextReservation = conflictingReservations[0];
            const formattedDate = new Date(
              nextReservation.checkInDate,
            ).toLocaleDateString('es-ES', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
            });

            throw new ConflictException(
              `No se puede extender la estadía porque hay otra reserva programada para la misma habitación a partir del ${formattedDate}`,
            );
          }

          // Todo está validado, actualizar la reserva con la nueva fecha
          const updated = await this.reservationRepository.updateWithTx(
            reservationId,
            {
              checkOutDate: parsedNewCheckoutDate.toISOString(),
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

          return {
            data: updated,
            message: `Estadía extendida correctamente hasta el ${parsedNewCheckoutDate.toLocaleDateString('es-ES')}`,
            success: true,
          };
        },
        { isolationLevel: 'Serializable' }, // Usar nivel de aislamiento Serializable
      );
    } catch (error) {
      this.logger.error(`Error al extender estadía: ${error.message}`, {
        error,
        reservationId,
        newCheckoutDate,
      });
      throw error; // Dejar que el servicio maneje el error
    }
  }
}
