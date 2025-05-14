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
import { ReservationStateFactory } from '../states/reservation-state.factory';
import { ConfirmBookingDto } from 'src/modules/landing/reservation/dto/confirm-reservation.dto';

@Injectable()
export class ConfirmPaymentLandingUseCase {
  private readonly logger = new Logger(ConfirmPaymentLandingUseCase.name);
  constructor(
    private readonly reservationRepository: ReservationRepository,
    private readonly auditRepository: AuditRepository,
    // private readonly roomRepository: RoomRepository,
    private readonly stateFactory: ReservationStateFactory,
  ) {}

  async execute(
    id: string,
    dto: ConfirmBookingDto,
    user: UserData,
  ): Promise<BaseApiResponse<Reservation>> {
    try {
      const updatedReservation = await this.reservationRepository.transaction(
        async (tx) => {
          // 1. Check if reservation exists
          const existingReservation =
            await this.reservationRepository.findById(id);

          if (!existingReservation) {
            throw new NotFoundException(`Reservation with ID ${id} not found`);
          }

          // 2. Get state handler for current status
          const currentStatus = this.stateFactory.getStateHandler(
            existingReservation.status,
          );

          // 3. Check if transition is valid
          const transitionResult = currentStatus.canTransitionTo('CONFIRMED');

          if (!transitionResult.isValid) {
            throw new BadRequestException(transitionResult.errorMessage);
          }

          const newCustomer = await tx.customer.upsert({
            where: {
              documentNumber: dto.customer.documentNumber,
            },
            update: {
              name: dto.customer.name + ' ' + dto.customer.lastname,
              email: dto.customer.email,
              phone: dto.customer.phone,
              documentType: dto.customer.documentType,
              documentNumber: dto.customer.documentNumber,
              createdByLandingPage: true,
            },
            create: {
              name: dto.customer.name + ' ' + dto.customer.lastname,
              email: dto.customer.email,
              phone: dto.customer.phone,
              documentType: dto.customer.documentType,
              documentNumber: dto.customer.documentNumber,
              createdByLandingPage: true,
            },
          });

          if (!newCustomer) {
            throw new BadRequestException(
              'Error al crear o actualizar el cliente',
            );
          }

          // 4. Update reservation status
          const reservation = await this.reservationRepository.updateWithTx(
            id,
            {
              status: 'CONFIRMED',
              createdByLandingPage: true,
              didAcceptExtraServices: dto.didAcceptExtraServices,
              didAcceptTerms: dto.didAcceptTermsAndConditions,
              observations: dto.observations,
              requestedGuestNumber: dto.reservation.guestNumber,
              isActive: transitionResult.isActive,
              updatedAt: new Date(),
            },
            tx,
          );

          // 5. Handle state-specific actions, like changing room status
          await currentStatus.handleTransition(
            existingReservation,
            'CONFIRMED',
            tx,
          );

          // 6. Register audit
          await this.auditRepository.createWithTx(
            {
              entityId: reservation.id,
              entityType: 'reservation',
              action: AuditActionType.UPDATE_STATUS,
              performedById: user.id,
            },
            tx,
          );

          return reservation;
        },
      );

      return {
        success: true,
        message: `Estado de reservación cambiado a CONFIRMED exitosamente`,
        data: updatedReservation,
      };
    } catch (error) {
      this.logger.error(
        `Error al cambiar estado de reservación: ${error.message}`,
        {
          error,
        },
      );

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
        'Ocurrió un error al actualizar el estado de la reservación. Por favor, intente nuevamente.',
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
