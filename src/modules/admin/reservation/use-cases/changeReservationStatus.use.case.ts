import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ReservationRepository } from '../repository/reservation.repository';
import { UserData } from 'src/interfaces';
import { AuditActionType, Prisma, ReservationStatus } from '@prisma/client';
import { BaseApiResponse } from 'src/utils/base-response/BaseApiResponse.dto';
import { Reservation } from '../entities/reservation.entity';
import { AuditRepository } from 'src/modules/admin/audit/audit.repository';
import { ReservationStateFactory } from '../states/reservation-state.factory';

@Injectable()
export class ChangeReservationStatusUseCase {
  private readonly logger = new Logger(ChangeReservationStatusUseCase.name);
  constructor(
    private readonly reservationRepository: ReservationRepository,
    private readonly auditRepository: AuditRepository,
    private readonly stateFactory: ReservationStateFactory,
  ) {}

  async execute(
    id: string,
    newStatus: ReservationStatus,
    user: UserData,
  ): Promise<BaseApiResponse<Reservation>> {
    try {
      // 1. Verificar si la reserva existe antes de iniciar la transacción
      const existingReservation = await this.reservationRepository.findById(id);

      if (!existingReservation) {
        throw new NotFoundException(`Reservation with ID ${id} not found`);
      }

      // 2. Obtener el manejador de estado para el estado actual
      const currentStatus = this.stateFactory.getStateHandler(
        existingReservation.status,
      );

      // 3. Verificar si la transición es válida antes de iniciar la transacción
      const transitionResult = await currentStatus.canTransitionTo(
        newStatus,
        existingReservation,
      );

      if (!transitionResult.isValid) {
        throw new BadRequestException(transitionResult.errorMessage);
      }

      // 4. Ahora que sabemos que la transición es válida, iniciamos la transacción
      const updatedReservation = await this.reservationRepository.transaction(
        async (tx) => {
          // Actualizar estado de reserva
          const reservation = await this.reservationRepository.updateWithTx(
            id,
            {
              status: newStatus,
              isActive: transitionResult.isActive,
              updatedAt: new Date(),
            },
            tx,
          );

          // Manejar acciones específicas del estado
          await currentStatus.handleTransition(
            existingReservation,
            newStatus,
            tx,
          );

          // Registrar auditoría
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
        message: `Estado de reservación cambiado a ${newStatus} exitosamente`,
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
