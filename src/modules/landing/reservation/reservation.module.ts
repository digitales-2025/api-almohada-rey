import { Module } from '@nestjs/common';
import { LandingReservationService } from './reservation.service';
import { RoomModule } from 'src/modules/admin/room/room.module';
// import { ReservationController } from './reservation.controller';

@Module({
  imports: [ReservationModule, RoomModule],
  // controllers: [ReservationController],
  providers: [LandingReservationService],
})
export class ReservationModule {}
