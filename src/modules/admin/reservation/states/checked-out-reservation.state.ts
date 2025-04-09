import { ReservationStatus } from '@prisma/client';
import { RoomRepository } from '../../room/repositories/room.repository';
import { Reservation } from '../entities/reservation.entity';
import {
  ReservationStateHandler,
  ReservationStateTransitionResult,
} from './reservation-state.interface';
import { PrismaTransaction } from 'src/prisma/src/types/prisma.types';
import { Injectable } from '@nestjs/common';

@Injectable()
export class CheckedOutReservationState implements ReservationStateHandler {
  constructor(private readonly roomRepository: RoomRepository) {}

  canTransitionTo(
    targetStatus: ReservationStatus,
  ): ReservationStateTransitionResult {
    switch (targetStatus) {
      case 'CHECKED_OUT':
        return { isValid: true, isActive: false };
      case 'PENDING':
        return {
          isValid: false,
          errorMessage:
            'Una reservación con check-out realizado no puede cambiar a PENDING',
          isActive: false,
        };
      case 'CONFIRMED':
        return {
          isValid: false,
          errorMessage:
            'Una reservación con check-out realizado no puede cambiar a CONFIRMED',
          isActive: false,
        };
      case 'CHECKED_IN':
        return {
          isValid: false,
          errorMessage:
            'Una reservación con check-out realizado no puede cambiar a CHECKED_IN',
          isActive: false,
        };
      case 'CANCELED':
        return {
          isValid: false,
          errorMessage:
            'Una reservación con check-out realizado no puede cambiar a CANCELED',
          isActive: false,
        };
      default:
        return {
          isValid: false,
          errorMessage: `Transición de estado inválida: CHECKED_OUT -> ${targetStatus}`,
          isActive: false,
        };
    }
  }

  async handleTransition(
    reservation: Reservation,
    _targetStatus: ReservationStatus,
    tx: PrismaTransaction,
  ): Promise<void> {
    await this.roomRepository.updateWithTx(
      reservation.roomId,
      { status: 'AVAILABLE' },
      tx,
    );
  }
}
