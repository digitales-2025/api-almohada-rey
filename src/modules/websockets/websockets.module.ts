import { forwardRef, Module } from '@nestjs/common';
import { ReservationGateway } from './reservation.gateway';
import { ReservationModule } from '../admin/reservation/reservation.module';

@Module({
  imports: [forwardRef(() => ReservationModule)],
  providers: [ReservationGateway],
  exports: [ReservationGateway],
})
export class WebsocketsModule {}
