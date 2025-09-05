import { Module, forwardRef } from '@nestjs/common';
import { AuditService } from './audit.service';
import { AuditController } from './audit.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { AuditRepository } from './audit.repository';
import { AuthModule } from '../auth/auth.module';

@Module({
  controllers: [AuditController],
  providers: [AuditService, AuditRepository],
  imports: [PrismaModule, forwardRef(() => AuthModule)],
  exports: [AuditService, AuditRepository],
})
export class AuditModule {}
