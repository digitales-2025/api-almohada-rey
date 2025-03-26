import { Module } from '@nestjs/common';
import { CustomersService } from './customers.service';
import { CustomersController } from './customers.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { AuditModule } from 'src/modules/admin/audit/audit.module';
import { CustomerRepository } from './repository/customer.repository';

@Module({
  controllers: [CustomersController],
  providers: [CustomersService, CustomerRepository],
  imports: [PrismaModule, AuditModule],
})
export class CustomersModule {}
