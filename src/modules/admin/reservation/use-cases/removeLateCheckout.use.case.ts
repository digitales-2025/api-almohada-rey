import {
  Injectable,
  BadRequestException,
  Logger,
  NotFoundException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { UserData } from 'src/interfaces';
import { AuditActionType, ReservationStatus } from '@prisma/client';
import { BaseApiResponse } from 'src/utils/base-response/BaseApiResponse.dto';
import { Reservation } from '../entities/reservation.entity';
import { ReservationRepository } from '../repository/reservation.repository';
import { AuditRepository } from '../../audit/audit.repository';
import { PaymentsService } from '../../payments/payments.service';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class RemoveLateCheckoutUseCase {
  private readonly logger = new Logger(RemoveLateCheckoutUseCase.name);

  constructor(
    private readonly reservationRepository: ReservationRepository,
    private readonly auditRepository: AuditRepository,
    @Inject(forwardRef(() => PaymentsService))
    private readonly paymentsService: PaymentsService,
    private readonly prisma: PrismaService,
  ) {}

  async execute(
    reservationId: string,
    user: UserData,
  ): Promise<BaseApiResponse<Reservation>> {
    try {
      // 1. Buscar la reserva
      const reservation =
        await this.reservationRepository.findById(reservationId);

      if (!reservation) {
        throw new NotFoundException(
          `No se encontró la reserva con ID ${reservationId}`,
        );
      }

      // 2. Verificar que tenga Late Checkout aplicado
      if (!reservation.appliedLateCheckOut) {
        throw new BadRequestException(
          'Esta reserva no tiene Late Checkout aplicado.',
        );
      }

      // 3. Verificar que el estado sea válido
      if (
        reservation.status !== ReservationStatus.CONFIRMED &&
        reservation.status !== ReservationStatus.CHECKED_IN
      ) {
        throw new BadRequestException(
          `No se puede eliminar el Late Checkout de una reserva con estado ${reservation.status}`,
        );
      }

      // 4. Buscar el detalle de pago por Late Checkout
      const paymentDetail =
        await this.findLateCheckoutPaymentDetail(reservationId);

      // 5. Actualizar la reserva (sin transacción compleja)
      const originalCheckoutDate = new Date(reservation.checkOutDate);
      originalCheckoutDate.setHours(12, 0, 0, 0); // Restaurar a mediodía

      const updated = await this.reservationRepository.update(reservationId, {
        appliedLateCheckOut: false,
        checkOutDate: originalCheckoutDate.toISOString(),
        updatedAt: new Date(),
      });

      // 6. Registrar auditoría
      await this.auditRepository.create({
        entityId: updated.id,
        entityType: 'reservation',
        action: AuditActionType.UPDATE,
        performedById: user.id,
      });

      // 7. Eliminar el detalle de pago si existe
      if (paymentDetail) {
        await this.paymentsService.removePaymentDetail(paymentDetail.id, user);
        this.logger.log(
          `Detalle de pago Late Checkout eliminado: ${paymentDetail.id}`,
        );
      }

      return {
        data: updated,
        message:
          'Late Checkout eliminado correctamente. Se ha restaurado la hora original de salida.',
        success: true,
      };
    } catch (error) {
      this.logger.error(`Error al eliminar late checkout: ${error.message}`, {
        error,
        reservationId,
        userId: user.id,
      });
      throw error;
    }
  }

  /**
   * Busca el detalle de pago asociado al Late Checkout de una reserva
   */
  private async findLateCheckoutPaymentDetail(reservationId: string) {
    try {
      // Buscamos el pago principal de la reserva
      const payment = await this.prisma.payment.findFirst({
        where: { reservationId },
        orderBy: { createdAt: 'desc' },
        select: { id: true },
      });

      if (!payment) return null;

      // Buscamos el detalle de tipo LATE_CHECKOUT asociado a este pago
      const paymentDetail = await this.prisma.paymentDetail.findFirst({
        where: {
          paymentId: payment.id,
          type: 'LATE_CHECKOUT',
        },
      });

      return paymentDetail;
    } catch (error) {
      this.logger.error(
        `Error al buscar detalle de pago de Late Checkout: ${error.message}`,
      );
      return null;
    }
  }
}
