import { Module } from '@nestjs/common';
import { LandingReservationService } from './reservation.service';
// import { ReservationController } from './reservation.controller';

@Module({
  imports: [ReservationModule],
  // controllers: [ReservationController],
  providers: [LandingReservationService],
})
export class ReservationModule {}
