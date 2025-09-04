import { Module } from '@nestjs/common';
import { CustomerReservationHistoryService } from './customer-reservation-history.service';
import { CustomerReservationHistoryController } from './customer-reservation-history.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  controllers: [CustomerReservationHistoryController],
  providers: [CustomerReservationHistoryService],
  imports: [PrismaModule, AuditModule],
  exports: [CustomerReservationHistoryService],
})
export class CustomerReservationHistoryModule {}
