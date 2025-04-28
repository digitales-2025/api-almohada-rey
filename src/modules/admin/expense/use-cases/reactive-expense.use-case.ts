import { Injectable } from '@nestjs/common';
import { ExpenseRepository } from '../repositories/expense.repository';
import { HotelExpenseEntity } from '../entities/expense.entity';
import { AuditActionType } from '@prisma/client';
import { UserData } from 'src/interfaces';
import { AuditService } from '../../audit/audit.service';
import { BaseApiResponse } from 'src/utils/base-response/BaseApiResponse.dto';

@Injectable()
export class ReactivateExpensesUseCase {
  constructor(
    private readonly expenseRepository: ExpenseRepository,
    private readonly auditService: AuditService,
  ) {}

  async execute(
    ids: string[],
    user: UserData,
  ): Promise<BaseApiResponse<HotelExpenseEntity[]>> {
    // Reactivar los gastos y registrar auditoría
    const reactivatedExpenses = await this.expenseRepository.transaction(
      async () => {
        const expenses = await this.expenseRepository.reactivateMany(ids);

        // Registrar auditoría para cada gasto reactivado
        await Promise.all(
          expenses.map((expense) =>
            this.auditService.create({
              entityId: expense.id,
              entityType: 'expense',
              action: AuditActionType.REACTIVATE,
              performedById: user.id,
              createdAt: new Date(),
            }),
          ),
        );

        return expenses;
      },
    );

    return {
      success: true,
      message: 'Gastos reactivados exitosamente',
      data: reactivatedExpenses,
    };
  }
}
