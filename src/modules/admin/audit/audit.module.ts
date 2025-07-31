import { Module } from '@nestjs/common';
import { AuditService } from './audit.service';
import { AuditController } from './audit.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { AuditRepository } from './audit.repository';

@Module({
  controllers: [AuditController],
  providers: [AuditService, AuditRepository],
  imports: [PrismaModule],
  exports: [AuditService, AuditRepository],
})
export class AuditModule {}
