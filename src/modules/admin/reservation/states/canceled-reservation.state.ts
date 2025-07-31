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
export class CanceledReservationState implements ReservationStateHandler {
  constructor(private readonly roomRepository: RoomRepository) {}

  canTransitionTo(
    targetStatus: ReservationStatus,
  ): ReservationStateTransitionResult {
    switch (targetStatus) {
      case 'CANCELED':
        return { isValid: true, isActive: false };
      case 'PENDING':
        return {
          isValid: false,
          errorMessage: 'Una reservación cancelada no puede cambiar a PENDING',
          isActive: false,
        };
      case 'CONFIRMED':
        return {
          isValid: false,
          errorMessage:
            'Una reservación cancelada no puede cambiar a CONFIRMED',
          isActive: false,
        };
      case 'CHECKED_IN':
        return {
          isValid: false,
          errorMessage:
            'Una reservación cancelada no puede cambiar a CHECKED_IN',
          isActive: false,
        };
      case 'CHECKED_OUT':
        return {
          isValid: false,
          errorMessage:
            'Una reservación cancelada no puede cambiar a CHECKED_OUT',
          isActive: false,
        };
      default:
        return {
          isValid: false,
          errorMessage: `Transición de estado inválida: CANCELED -> ${targetStatus}`,
          isActive: false,
        };
    }
  }

  async handleTransition(
    reservation: Reservation,
    targetStatus: ReservationStatus,
    tx: PrismaTransaction,
  ): Promise<void> {
    // No se requieren acciones adicionales para transiciones desde CANCELED
    // ya que no hay transiciones válidas excepto a sí mismo
  }
}
