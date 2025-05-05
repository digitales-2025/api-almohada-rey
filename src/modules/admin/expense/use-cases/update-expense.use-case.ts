import { Injectable } from '@nestjs/common';
import { UpdateHotelExpenseDto } from '../dto';
import { HotelExpenseEntity } from '../entities/expense.entity';
import { ExpenseRepository } from '../repositories/expense.repository';
import { AuditActionType } from '@prisma/client';
import { UserData } from 'src/interfaces';
import { AuditService } from '../../audit/audit.service';
import { BaseApiResponse } from 'src/utils/base-response/BaseApiResponse.dto';

@Injectable()
export class UpdateExpenseUseCase {
  constructor(
    private readonly expenseRepository: ExpenseRepository,
    private readonly auditService: AuditService,
  ) {}

  async execute(
    id: string,
    updateHotelExpenseDto: UpdateHotelExpenseDto,
    user: UserData,
  ): Promise<BaseApiResponse<HotelExpenseEntity>> {
    const updatedExpense = await this.expenseRepository.transaction(
      async () => {
        // Preparar los datos para actualización
        const updateData = {
          description: updateHotelExpenseDto.description,
          category: updateHotelExpenseDto.category,
          paymentMethod: updateHotelExpenseDto.paymentMethod,
          amount: updateHotelExpenseDto.amount,
          date: updateHotelExpenseDto.date,
          documentType: updateHotelExpenseDto.documentType,
          documentNumber: updateHotelExpenseDto.documentNumber,
        };

        // Si dataDocument está presente y es true, forzar documentType y documentNumber a null
        if (updateHotelExpenseDto.dataDocument === false) {
          updateData.documentType = null;
          updateData.documentNumber = null;
        }

        // Actualizar gasto
        const expense = await this.expenseRepository.update(id, updateData);

        // Registrar auditoría
        await this.auditService.create({
          entityId: expense.id,
          entityType: 'expense',
          action: AuditActionType.UPDATE,
          performedById: user.id,
          createdAt: new Date(),
        });

        return expense;
      },
    );

    return {
      success: true,
      message: 'Gasto actualizado exitosamente',
      data: updatedExpense,
    };
  }
}
