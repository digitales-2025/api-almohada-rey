import { Injectable } from '@nestjs/common';
import { ExpenseRepository } from '../repositories/expense.repository';
import { HotelExpenseEntity } from '../entities/expense.entity';
import { AuditActionType } from '@prisma/client';
import { DeleteHotelExpenseDto } from '../dto';
import { UserData } from 'src/interfaces';
import { AuditService } from '../../audit/audit.service';
import { BaseApiResponse } from 'src/utils/base-response/BaseApiResponse.dto';

@Injectable()
export class DeleteExpensesUseCase {
  constructor(
    private readonly expenseRepository: ExpenseRepository,
    private readonly auditService: AuditService,
  ) {}

  async execute(
    deleteHotelExpenseDto: DeleteHotelExpenseDto,
    user: UserData,
  ): Promise<BaseApiResponse<HotelExpenseEntity[]>> {
    const deletedExpenses = await this.expenseRepository.transaction(
      async () => {
        // Realizar soft delete y obtener gastos actualizados
        const expenses = await this.expenseRepository.softDeleteManyDelete(
          deleteHotelExpenseDto.ids,
        );

        // Registrar auditoría para cada gasto eliminado
        await Promise.all(
          expenses.map((expense) =>
            this.auditService.create({
              entityId: expense.id,
              entityType: 'expense',
              action: AuditActionType.DELETE,
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
      message: 'Gastos eliminados exitosamente',
      data: deletedExpenses,
    };
  }
}
