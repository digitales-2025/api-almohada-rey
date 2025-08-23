import { Module } from '@nestjs/common';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AuditModule } from './audit/audit.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { ProductModule } from './product/product.module';
import { ReservationModule } from './reservation/reservation.module';
import { PaymentsModule } from './payments/payments.module';
import { WarehouseModule } from './warehouse/warehouse.module';
import { MovementsModule } from './movements/movements.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { CustomersModule } from './customers/customers.module';
import { RucModule } from './ruc/ruc.module';

@Module({
  imports: [
    UsersModule,
    AuthModule,
    PrismaModule,
    AuditModule,
    ProductModule,
    ReservationModule,
    PaymentsModule,
    WarehouseModule,
    MovementsModule,
    DashboardModule,
    CustomersModule,
    RucModule,
  ],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [],
})
export class AdminModule {}
