import { ReservationStatus } from '@prisma/client';
import { Reservation } from '../entities/reservation.entity';
import { PrismaTransaction } from 'src/prisma/src/types/prisma.types';

export interface ReservationStateTransitionResult {
  isValid: boolean;
  errorMessage?: string;
  isActive: boolean;
  roomStatusUpdate?: {
    status: string;
  };
}

export interface ReservationStateHandler {
  canTransitionTo(
    targetStatus: ReservationStatus,
    reservation?: Reservation,
  ):
    | Promise<ReservationStateTransitionResult>
    | ReservationStateTransitionResult;

  handleTransition(
    reservation: Reservation,
    targetStatus: ReservationStatus,
    tx: PrismaTransaction,
  ): Promise<void>;
}
