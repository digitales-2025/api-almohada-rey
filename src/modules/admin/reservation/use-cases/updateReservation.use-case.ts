import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ReservationRepository } from '../repository/reservation.repository';
import { UserData } from 'src/interfaces';
import { AuditActionType, Prisma } from '@prisma/client';
import { BaseApiResponse } from 'src/utils/base-response/BaseApiResponse.dto';
import { Reservation } from '../entities/reservation.entity';
import { AuditRepository } from 'src/modules/admin/audit/audit.repository';
import { Guest, GuestBuilder } from '../entities/guest.entity';
import { RoomRepository } from '../../room/repositories/room.repository';

@Injectable()
export class UpdateReservationUseCase {
  private readonly logger = new Logger(UpdateReservationUseCase.name);
  constructor(
    private readonly reservationRepository: ReservationRepository,
    private readonly auditRepository: AuditRepository,
    private readonly roomRepository: RoomRepository,
  ) {}

  async execute(
    id: string,
    possibleUpdatedReservation: Partial<Reservation>,
    user: UserData,
  ): Promise<BaseApiResponse<Reservation>> {
    try {
      const updatedReservation = await this.reservationRepository.transaction(
        async (tx) => {
          // 0. Check if reservation exists
          const existingReservation =
            await this.reservationRepository.findById(id);

          if (!existingReservation) {
            throw new NotFoundException(`Reservation with ID ${id} not found`);
          }

          // 1. Update guests if provided
          let localGuests: Guest[] | undefined = undefined;
          let guestsData: string | undefined = undefined;
          if (possibleUpdatedReservation.guests) {
            localGuests = JSON.parse(
              possibleUpdatedReservation.guests,
            ) as Guest[];
            const guests = localGuests.map((guest) => {
              return new GuestBuilder()
                .withName(guest.name)
                .withAge(guest?.age)
                .withDocumentType(guest?.documentType)
                .withDocumentId(guest?.documentId)
                .withPhone(guest?.phone)
                .withEmail(guest?.email)
                .withBirthDate(guest?.birthDate)
                .withAdditionalInfo(guest?.additionalInfo)
                .build();
            });
            guestsData = JSON.stringify(guests);
          }

          let isActive = true;

          const updateReservationStatus = possibleUpdatedReservation.status;
          if (updateReservationStatus) {
            if (
              existingReservation.status === 'CANCELED' &&
              updateReservationStatus !== 'CANCELED'
            ) {
              throw new BadRequestException(
                `Reservación con el ID ${id} no puede ser actualizada porque ya fue cancelada`,
              );
            }
            if (
              existingReservation.status === 'CHECKED_IN' &&
              updateReservationStatus === 'CANCELED'
            ) {
              throw new BadRequestException(
                `Reservación con el ID ${id} no puede ser CANCELADA porque ya está ACTIVA`,
              );
            }
            if (
              existingReservation.status === 'CHECKED_IN' &&
              (updateReservationStatus == 'PENDING' ||
                updateReservationStatus == 'CONFIRMED')
            ) {
              throw new BadRequestException(
                `Reservación con el ID ${id} no puede ser actualizada porque ya está CHECKED_IN`,
              );
            }
            if (
              existingReservation.status === 'CHECKED_OUT' &&
              updateReservationStatus !== 'CHECKED_OUT'
            ) {
              throw new BadRequestException(
                `Reservación con el ID ${id} no puede ser actualizada porque ya fue consumada`,
              );
            }
            if (
              updateReservationStatus === 'CHECKED_IN' &&
              existingReservation.status == 'CONFIRMED'
            ) {
              await this.roomRepository.updateWithTx(
                possibleUpdatedReservation.roomId,
                { status: 'OCCUPIED' },
                tx,
              );
            }
            if (
              updateReservationStatus === 'CHECKED_OUT' &&
              existingReservation.status == 'CHECKED_IN'
            ) {
              await this.roomRepository.updateWithTx(
                possibleUpdatedReservation.roomId,
                { status: 'CLEANING' },
                tx,
              );
            }

            //if canceled and confirmed
            if (
              updateReservationStatus === 'CANCELED' &&
              existingReservation.status == 'CONFIRMED'
            ) {
              //Add more actions when cancel reservation
              isActive = false;
            }
          }

          const reservation = await this.reservationRepository.updateWithTx(
            id,
            {
              ...(possibleUpdatedReservation.customerId && {
                customerId: possibleUpdatedReservation.customerId,
              }),
              ...(possibleUpdatedReservation.userId && {
                userId: possibleUpdatedReservation.userId,
              }),
              ...(possibleUpdatedReservation.roomId && {
                roomId: possibleUpdatedReservation.roomId,
              }),
              ...(possibleUpdatedReservation.checkInDate && {
                checkInDate: possibleUpdatedReservation.checkInDate,
              }),
              ...(possibleUpdatedReservation.checkOutDate && {
                checkOutDate: possibleUpdatedReservation.checkOutDate,
              }),
              ...(possibleUpdatedReservation.origin && {
                origin: possibleUpdatedReservation.origin,
              }),
              ...(possibleUpdatedReservation.reason && {
                reason: possibleUpdatedReservation.reason,
              }),
              ...(possibleUpdatedReservation.status && {
                status: possibleUpdatedReservation.status,
              }),
              ...(guestsData && { guests: guestsData }),
              ...(possibleUpdatedReservation.observations && {
                observations: possibleUpdatedReservation.observations,
              }),
              isActive,
              updatedAt: new Date(),
            },
            tx,
          );

          // 3. Register audit
          await this.auditRepository.createWithTx(
            {
              entityId: reservation.id,
              entityType: 'reservation',
              action: AuditActionType.UPDATE,
              performedById: user.id,
            },
            tx,
          );

          return reservation;
        },
      );

      return {
        success: true,
        message: 'Reservación actualizada exitosamente',
        data: updatedReservation,
      };
    } catch (error) {
      this.logger.error(`Error al actualizar reservación: ${error.message}`, {
        error,
      });

      if (error instanceof NotFoundException) {
        throw error;
      }

      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        const userMessage = this.getPrismaErrorMessage(error);
        throw new BadRequestException(userMessage);
      }

      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new InternalServerErrorException(
        'Ocurrió un error al actualizar la reservación. Por favor, intente nuevamente.',
      );
    }
  }

  /**
   * Convierte errores de Prisma en mensajes amigables para el usuario
   */
  private getPrismaErrorMessage(
    error: Prisma.PrismaClientKnownRequestError,
  ): string {
    switch (error.code) {
      case 'P2002':
        return `Ya existe una reservación con estos datos: ${error.meta?.target}`;
      case 'P2003':
        return 'No se pudo actualizar la reservación porque alguno de los registros relacionados no existe';
      case 'P2025':
        return 'No se encontró la reservación o alguno de los registros necesarios para esta operación';
      default:
        return `Error al procesar la reservación: ${error.code}`;
    }
  }
}
