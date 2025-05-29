import { forwardRef, Module } from '@nestjs/common';
import { WarehouseService } from './warehouse.service';
import { WarehouseController } from './warehouse.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { PaginationModule } from 'src/pagination/pagination.module';
import { MovementsModule } from '../movements/movements.module';
import { WarehouseExcelReport } from './warehouse.excel.report';

@Module({
  controllers: [WarehouseController],
  providers: [WarehouseService, WarehouseExcelReport],
  imports: [PrismaModule, PaginationModule, forwardRef(() => MovementsModule)],
  exports: [WarehouseService],
})
export class WarehouseModule {}
