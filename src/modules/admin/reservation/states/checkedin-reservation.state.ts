import { ReservationStatus } from '@prisma/client';
import { RoomRepository } from '../../room/repositories/room.repository';
import { Reservation } from '../entities/reservation.entity';
import {
  ReservationStateHandler,
  ReservationStateTransitionResult,
} from './reservation-state.interface';
import { PrismaTransaction } from 'src/prisma/src/types/prisma.types';
import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { ReservationRepository } from '../repository/reservation.repository';
import { PaymentsService } from '../../payments/payments.service';

@Injectable()
export class CheckedInReservationState implements ReservationStateHandler {
  private readonly logger = new Logger(CheckedInReservationState.name);

  constructor(
    private readonly roomRepository: RoomRepository,
    private readonly reservationRepository: ReservationRepository,
    @Inject(forwardRef(() => PaymentsService))
    private readonly paymentsService: PaymentsService,
  ) {}

  async canTransitionTo(
    targetStatus: ReservationStatus,
    reservation?: Reservation,
  ): Promise<ReservationStateTransitionResult> {
    switch (targetStatus) {
      case 'CHECKED_IN':
        return { isValid: true, isActive: true };
      case 'PENDING':
        return {
          isValid: false,
          errorMessage:
            'Una reservación con check-in no puede regresar a pendiente',
          isActive: true,
        };
      case 'CONFIRMED':
        return {
          isValid: false,
          errorMessage:
            'Una reservación con check-in no puede regresar a confirmada',
          isActive: true,
        };
      case 'CANCELED':
        return { isValid: true, isActive: false };
      case 'CHECKED_OUT':
        // Verificar que la reserva tenga un pago en estado PAID
        if (reservation) {
          // Buscar el pago relacionado con la reserva
          const hasPaymentPending =
            await this.paymentsService.validateReservationPaymentPending(
              reservation.id,
            );

          // Verificamos si el pago está en estado PAID
          if (hasPaymentPending) {
            return {
              isValid: false,
              errorMessage:
                'No se puede realizar el checkout, se cuentan con pagos pendientes',
              isActive: true,
            };
          }
        }

        return {
          isValid: true,
          isActive: false,
          roomStatusUpdate: { status: 'AVAILABLE' },
        };
      default:
        return {
          isValid: false,
          errorMessage: `Transición de estado inválida: CHECKED_IN -> ${targetStatus}`,
          isActive: true,
        };
    }
  }

  async handleTransition(
    reservation: Reservation,
    targetStatus: ReservationStatus,
    tx: PrismaTransaction,
  ): Promise<void> {
    if (targetStatus === 'CHECKED_OUT') {
      this.roomRepository.updateWithTx(
        reservation.roomId,
        {
          status: 'CLEANING',
          trashBin: false,
          towel: false,
          toiletPaper: false,
          showerSoap: false,
          handSoap: false,
          lamp: false,
        },
        tx,
      );
    }

    if (targetStatus === 'CANCELED') {
      await this.reservationRepository.updateWithTx(
        reservation.id,
        {
          isPendingDeletePayment: true,
        },
        tx,
      );
    }
  }
}
