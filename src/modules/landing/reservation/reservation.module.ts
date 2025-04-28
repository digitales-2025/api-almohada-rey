import { Module } from '@nestjs/common';
import { LandingReservationService } from './reservation.service';
import { RoomModule } from 'src/modules/admin/room/room.module';
import { ReservationModule as AdminReservationModule } from 'src/modules/admin/reservation/reservation.module';
// import { ReservationController } from './reservation.controller';

@Module({
  imports: [AdminReservationModule, RoomModule],
  // controllers: [ReservationController],
  providers: [LandingReservationService],
})
export class ReservationModule {}
