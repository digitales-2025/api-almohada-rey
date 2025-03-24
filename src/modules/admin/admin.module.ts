import { Module } from '@nestjs/common';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AuditModule } from './audit/audit.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { ProductModule } from './product/product.module';

@Module({
  imports: [UsersModule, AuthModule, PrismaModule, AuditModule, ProductModule],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [],
})
export class AdminModule {}
