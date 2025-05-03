import { forwardRef, Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { ReservationModule } from '../reservation/reservation.module';
import { RoomModule } from '../room/room.module';
import { ServiceModule } from '../service/service.module';
import { ProductModule } from '../product/product.module';
import { PaginationModule } from 'src/pagination/pagination.module';

@Module({
  controllers: [PaymentsController],
  providers: [PaymentsService],
  imports: [
    PrismaModule,
    AuditModule,
    forwardRef(() => ReservationModule),
    RoomModule,
    ServiceModule,
    ProductModule,
    PaginationModule,
  ],
  exports: [PaymentsService],
})
export class PaymentsModule {}
