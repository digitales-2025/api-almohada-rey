import { forwardRef, Module } from '@nestjs/common';
import { MovementsService } from './movements.service';
import { MovementsController } from './movements.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { PaginationModule } from 'src/pagination/pagination.module';
import { WarehouseModule } from '../warehouse/warehouse.module';
import { ProductModule } from '../product/product.module';

@Module({
  controllers: [MovementsController],
  providers: [MovementsService],
  imports: [
    PrismaModule,
    PaginationModule,
    forwardRef(() => WarehouseModule),
    ProductModule,
  ],
  exports: [MovementsService],
})
export class MovementsModule {}
