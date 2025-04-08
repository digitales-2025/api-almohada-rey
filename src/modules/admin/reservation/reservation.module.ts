import { Module } from '@nestjs/common';
import { ReservationService } from './reservation.service';
import { ReservationController } from './reservation.controller';
import { ReservationRepository } from './repository/reservation.repository';
import { CreateReservationUseCase } from './use-cases/createReservation.use-case';
import { AuditModule } from '../audit/audit.module';
import { RoomModule } from '../room/room.module';
import { UpdateReservationUseCase } from './use-cases/updateReservation.use-case';

@Module({
  imports: [AuditModule, RoomModule],
  controllers: [ReservationController],
  providers: [
    ReservationService,
    ReservationRepository,
    CreateReservationUseCase,
    UpdateReservationUseCase,
  ],
  exports: [ReservationService],
})
export class ReservationModule {}
