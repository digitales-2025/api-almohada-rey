/* eslint-disable @typescript-eslint/no-unused-vars */
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
export class PendingReservationState implements ReservationStateHandler {
  constructor(private readonly roomRepository: RoomRepository) {}

  canTransitionTo(
    targetStatus: ReservationStatus,
  ): ReservationStateTransitionResult {
    switch (targetStatus) {
      case 'PENDING':
        return { isValid: true, isActive: true };
      case 'CONFIRMED':
        return { isValid: true, isActive: true };
      case 'CANCELED':
        return { isValid: true, isActive: false };
      case 'CHECKED_IN':
        return {
          isValid: false,
          errorMessage:
            'Una reservación pendiente no puede pasar directamente a check-in',
          isActive: true,
        };
      case 'CHECKED_OUT':
        return {
          isValid: false,
          errorMessage:
            'Una reservación pendiente no puede pasar directamente a check-out',
          isActive: true,
        };
      default:
        return {
          isValid: false,
          errorMessage: `Transición de estado inválida: PENDING -> ${targetStatus}`,
          isActive: true,
        };
    }
  }

  async handleTransition(
    reservation: Reservation,
    targetStatus: ReservationStatus,
    tx: PrismaTransaction,
  ): Promise<void> {
    // No se requieren acciones adicionales para transiciones desde PENDING
  }
}
