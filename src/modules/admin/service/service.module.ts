import { Module } from '@nestjs/common';

import { AuditModule } from '../audit/audit.module';
import { ServiceController } from './controllers/service.controller';
import { ServiceService } from './services/service.service';
import { UpdateServiceUseCase } from './use-cases';
import { ServiceRepository } from './repositories/service.repository';

@Module({
  controllers: [ServiceController],
  imports: [AuditModule],
  providers: [ServiceRepository, ServiceService, UpdateServiceUseCase],
  exports: [ServiceService, ServiceRepository],
})
export class ServiceModule {}
