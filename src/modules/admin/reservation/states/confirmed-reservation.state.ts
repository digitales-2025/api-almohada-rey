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
export class ConfirmedReservationState implements ReservationStateHandler {
  constructor(private readonly roomRepository: RoomRepository) {}

  canTransitionTo(
    targetStatus: ReservationStatus,
  ): ReservationStateTransitionResult {
    switch (targetStatus) {
      case 'CONFIRMED':
        return { isValid: true, isActive: true };
      case 'PENDING':
        return { isValid: true, isActive: true };
      case 'CANCELED':
        return { isValid: true, isActive: false };
      case 'CHECKED_IN':
        return {
          isValid: true,
          isActive: true,
          roomStatusUpdate: { status: 'OCCUPIED' },
        };
      case 'CHECKED_OUT':
        return {
          isValid: false,
          errorMessage:
            'Una reservación confirmada no puede pasar directamente a check-out',
          isActive: true,
        };
      default:
        return {
          isValid: false,
          errorMessage: `Transición de estado inválida: CONFIRMED -> ${targetStatus}`,
          isActive: true,
        };
    }
  }

  async handleTransition(
    reservation: Reservation,
    targetStatus: ReservationStatus,
    tx: PrismaTransaction,
  ): Promise<void> {
    if (targetStatus === 'CHECKED_IN') {
      await this.roomRepository.updateWithTx(
        reservation.roomId,
        { status: 'OCCUPIED' },
        tx,
      );
    }
  }
}
