import { Module } from '@nestjs/common';
import { ReportsController } from './controllers/reports.controller';
import { ReportsService } from './services/reports.service';
import { ReportsRepository } from './repositories/reports.repository';
import { PrismaModule } from 'src/prisma/prisma.module';
import { BalanceReportUseCase } from './use-cases/balance-report.use-case';
import { ExpenseReportUseCase } from './use-cases/expense-report.use-case';
import { ProfitReportUseCase } from './use-cases/profit-report.use-case';
import { ProfitTypeRoomReportUseCase } from './use-cases/profit-typeroom-report.use-case';
import { OccupancyReportUseCase } from './use-cases/occupancy-report.use-case';

@Module({
  imports: [PrismaModule],
  controllers: [ReportsController],
  providers: [
    ReportsService,
    ReportsRepository,
    BalanceReportUseCase,
    ExpenseReportUseCase,
    ProfitReportUseCase,
    ProfitTypeRoomReportUseCase,
    OccupancyReportUseCase,
  ],
})
export class ReportsModule {}
