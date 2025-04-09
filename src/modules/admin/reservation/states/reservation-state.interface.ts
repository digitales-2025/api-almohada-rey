import { ReservationStatus, RoomStatus } from '@prisma/client';
import { Reservation } from '../entities/reservation.entity';
import { PrismaTransaction } from 'src/prisma/src/types/prisma.types';

export interface ReservationStateTransitionResult {
  isValid: boolean;
  errorMessage?: string;
  isActive: boolean;
  roomStatusUpdate?: {
    status: RoomStatus;
  };
}

export interface ReservationStateHandler {
  canTransitionTo(
    targetStatus: ReservationStatus,
  ): ReservationStateTransitionResult;
  handleTransition(
    reservation: Reservation,
    targetStatus: ReservationStatus,
    tx: PrismaTransaction,
  ): Promise<void>;
}
