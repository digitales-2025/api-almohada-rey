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
import { MovementsModule } from '../movements/movements.module';
import { WarehouseModule } from '../warehouse/warehouse.module';

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
    MovementsModule,
    WarehouseModule,
  ],
  exports: [PaymentsService],
})
export class PaymentsModule {}
