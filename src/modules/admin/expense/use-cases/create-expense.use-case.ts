import { Injectable } from '@nestjs/common';
import { CreateHotelExpenseDto } from '../dto';
import { HotelExpenseEntity } from '../entities/expense.entity';
import { ExpenseRepository } from '../repositories/expense.repository';
import { AuditActionType } from '@prisma/client';
import { UserData } from 'src/interfaces';
import { AuditService } from '../../audit/audit.service';
import { BaseApiResponse } from 'src/utils/base-response/BaseApiResponse.dto';

@Injectable()
export class CreateExpenseUseCase {
  constructor(
    private readonly expenseRepository: ExpenseRepository,
    private readonly auditService: AuditService,
  ) {}

  async execute(
    createHotelExpenseDto: CreateHotelExpenseDto,
    user: UserData,
  ): Promise<BaseApiResponse<HotelExpenseEntity>> {
    const newExpense = await this.expenseRepository.transaction(async () => {
      // Crear gasto
      const expense = await this.expenseRepository.create({
        description: createHotelExpenseDto.description,
        category: createHotelExpenseDto.category,
        paymentMethod: createHotelExpenseDto.paymentMethod,
        amount: createHotelExpenseDto.amount,
        date: createHotelExpenseDto.date,
        documentType: createHotelExpenseDto.documentType || null,
        documentNumber: createHotelExpenseDto.documentNumber || null,
      });

      // Registrar auditoría
      await this.auditService.create({
        entityId: expense.id,
        entityType: 'expense',
        action: AuditActionType.CREATE,
        performedById: user.id,
        createdAt: new Date(),
      });

      return expense;
    });

    return {
      success: true,
      message: 'Gasto creado exitosamente',
      data: newExpense,
    };
  }
}
