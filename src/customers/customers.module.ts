import { Module } from '@nestjs/common';
import { CustomersService } from './customers.service';
import { CustomersController } from './customers.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { AuditModule } from 'src/modules/admin/audit/audit.module';

@Module({
  controllers: [CustomersController],
  providers: [CustomersService],
  imports: [PrismaModule, AuditModule],
})
export class CustomersModule {}
