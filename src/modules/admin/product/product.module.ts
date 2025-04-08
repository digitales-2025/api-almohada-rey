import { Module } from '@nestjs/common';
import { ProductService } from './product.service';
import { ProductController } from './product.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  controllers: [ProductController],
  providers: [ProductService],
  imports: [PrismaModule, AuditModule],
  exports: [ProductService],
})
export class ProductModule {}
