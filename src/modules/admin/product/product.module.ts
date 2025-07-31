import { Module } from '@nestjs/common';
import { ProductService } from './product.service';
import { ProductController } from './product.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { PaginationModule } from 'src/pagination/pagination.module';

@Module({
  controllers: [ProductController],
  providers: [ProductService],
  imports: [PrismaModule, AuditModule, PaginationModule],
  exports: [ProductService],
})
export class ProductModule {}
