import { forwardRef, Module } from '@nestjs/common';
import { WarehouseService } from './warehouse.service';
import { WarehouseController } from './warehouse.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { PaginationModule } from 'src/pagination/pagination.module';
import { MovementsModule } from '../movements/movements.module';

@Module({
  controllers: [WarehouseController],
  providers: [WarehouseService],
  imports: [PrismaModule, PaginationModule, forwardRef(() => MovementsModule)],
  exports: [WarehouseService],
})
export class WarehouseModule {}
