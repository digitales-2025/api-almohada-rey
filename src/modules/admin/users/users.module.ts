import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { AuditModule } from '../audit/audit.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { PaginationModule } from 'src/pagination/pagination.module';

@Module({
  controllers: [UsersController],
  providers: [UsersService],
  imports: [PrismaModule, AuditModule, PaginationModule],
  exports: [UsersService],
})
export class UsersModule {}
