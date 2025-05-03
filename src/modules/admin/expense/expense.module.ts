import { Module } from '@nestjs/common';

import { AuditModule } from '../audit/audit.module';
import { ExpenseController } from './controllers/expense.controller';
import { ExpenseService } from './services/expense.service';
import {
  CreateExpenseUseCase,
  UpdateExpenseUseCase,
  DeleteExpensesUseCase,
  ReactivateExpensesUseCase,
} from './use-cases';
import { ExpenseRepository } from './repositories/expense.repository';

@Module({
  controllers: [ExpenseController],
  imports: [AuditModule],
  providers: [
    // use cases para gastos
    ExpenseRepository,
    ExpenseService,
    CreateExpenseUseCase,
    UpdateExpenseUseCase,
    DeleteExpensesUseCase,
    ReactivateExpensesUseCase,
  ],
  exports: [ExpenseService, ExpenseRepository],
})
export class ExpenseModule {}
