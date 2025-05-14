import { Module } from '@nestjs/common';
import { LandingReservationService } from './reservation.service';
import { RoomModule } from 'src/modules/admin/room/room.module';
import { ReservationModule as AdminReservationModule } from 'src/modules/admin/reservation/reservation.module';
import { ReservationController } from './reservation.controller';
import { Translation } from '../i18n/translation';
import { ReservationGateway } from './websockets/reservation.gateway';
import { UsersModule } from 'src/modules/admin/users/users.module';
import { HeartbeatService } from './websockets/reservation.heartbeat.service';

@Module({
  imports: [AdminReservationModule, RoomModule, UsersModule],
  controllers: [ReservationController],
  providers: [
    LandingReservationService,
    Translation,
    ReservationGateway,
    HeartbeatService,
  ],
})
export class ReservationModule {}
