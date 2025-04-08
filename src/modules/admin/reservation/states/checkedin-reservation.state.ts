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
export class CheckedInReservationState implements ReservationStateHandler {
  constructor(private readonly roomRepository: RoomRepository) {}

  canTransitionTo(
    targetStatus: ReservationStatus,
  ): ReservationStateTransitionResult {
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
      await this.roomRepository.updateWithTx(
        reservation.roomId,
        { status: 'AVAILABLE' },
        tx,
      );
    }
  }
}
