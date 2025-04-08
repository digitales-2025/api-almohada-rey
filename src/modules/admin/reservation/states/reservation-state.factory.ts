import { Injectable } from '@nestjs/common';
import { ReservationStatus } from '@prisma/client';
import { ReservationStateHandler } from './reservation-state.interface';
import { CheckedInReservationState } from './checkedin-reservation.state';
import { PendingReservationState } from './pending-reservation.state';
import { ConfirmedReservationState } from './confirmed-reservation.state';
import { CheckedOutReservationState } from './checked-out-reservation.state';
import { CanceledReservationState } from './canceled-reservation.state';
import { ReservationStatusAvailableActions } from '../entities/reservation.status-actions';

@Injectable()
export class ReservationStateFactory {
  constructor(
    private readonly pendingState: PendingReservationState,
    private readonly confirmedState: ConfirmedReservationState,
    private readonly checkedInState: CheckedInReservationState,
    private readonly checkedOutState: CheckedOutReservationState,
    private readonly canceledState: CanceledReservationState,
  ) {}

  getStateHandler(currentStatus: ReservationStatus): ReservationStateHandler {
    switch (currentStatus) {
      case 'PENDING':
        return this.pendingState;
      case 'CONFIRMED':
        return this.confirmedState;
      case 'CHECKED_IN':
        return this.checkedInState;
      case 'CHECKED_OUT':
        return this.checkedOutState;
      case 'CANCELED':
        return this.canceledState;
      default:
        throw new Error(`Estado de reserva desconocido: ${currentStatus}`);
    }
  }

  getAvailableActions(
    currentStatus: ReservationStatus,
  ): ReservationStatusAvailableActions {
    switch (currentStatus) {
      case 'PENDING':
        return {
          canConfirm: true,
          canCheckIn: false,
          canCheckOut: false,
          canCancel: true,
          canModify: true,
          canReactivate: false,
        };
      case 'CONFIRMED':
        return {
          canConfirm: false,
          canCheckIn: true,
          canCheckOut: false,
          canCancel: true,
          canModify: true,
          canReactivate: false,
        };
      case 'CHECKED_IN':
        return {
          canConfirm: false,
          canCheckIn: false,
          canCheckOut: true,
          canCancel: false,
          canModify: false,
          canReactivate: false,
        };
      case 'CHECKED_OUT':
        return {
          canConfirm: false,
          canCheckIn: false,
          canCheckOut: false,
          canCancel: false,
          canModify: false,
          canReactivate: false,
        };
      case 'CANCELED':
        return {
          canConfirm: false,
          canCheckIn: false,
          canCheckOut: false,
          canCancel: false,
          canModify: false,
          canReactivate: true,
        };
      default:
        throw new Error(`Estado de reserva desconocido: ${currentStatus}`);
    }
  }
}
