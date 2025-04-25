import { Module } from '@nestjs/common';
import { ReservationService } from './reservation.service';
import { ReservationController } from './reservation.controller';
import { ReservationRepository } from './repository/reservation.repository';
import { CreateReservationUseCase } from './use-cases/createReservation.use-case';
import { AuditModule } from '../audit/audit.module';
import { RoomModule } from '../room/room.module';
import { UpdateReservationUseCase } from './use-cases/updateReservation.use-case';
import {
  CanceledReservationState,
  CheckedInReservationState,
  CheckedOutReservationState,
  ConfirmedReservationState,
  PendingReservationState,
  ReservationStateFactory,
} from './states';
import { ChangeReservationStatusUseCase } from './use-cases/changeReservationStatus.use.case';
import { DeactivateReservationsUseCase } from './use-cases/deactivateReservations.use-case';
import { ReactivateReservationsUseCase } from './use-cases/reactivateReservations.use-case';

@Module({
  imports: [AuditModule, RoomModule],
  controllers: [ReservationController],
  providers: [
    ReservationService,
    ReservationRepository,
    CreateReservationUseCase,
    UpdateReservationUseCase,
    CanceledReservationState,
    CheckedOutReservationState,
    CheckedInReservationState,
    ConfirmedReservationState,
    PendingReservationState,
    ReservationStateFactory,
    ChangeReservationStatusUseCase,
    DeactivateReservationsUseCase,
    ReactivateReservationsUseCase,
  ],
  exports: [ReservationService, ReservationRepository],
})
export class ReservationModule {}
