import { forwardRef, Module } from '@nestjs/common';
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
import { WebsocketsModule } from 'src/modules/websockets/websockets.module';
import { PaymentsModule } from '../payments/payments.module';

@Module({
  imports: [
    AuditModule,
    RoomModule,
    forwardRef(() => WebsocketsModule),
    forwardRef(() => PaymentsModule),
  ],
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
  exports: [ReservationService],
})
export class ReservationModule {}
