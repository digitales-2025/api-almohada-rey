import { Module } from '@nestjs/common';
import { AuditService } from './audit.service';
import { AuditController } from './audit.controller';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  controllers: [AuditController],
  providers: [AuditService],
  imports: [PrismaModule],
  exports: [AuditService],
})
export class AuditModule {}
