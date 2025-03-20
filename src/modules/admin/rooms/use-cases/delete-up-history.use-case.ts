import { Injectable } from '@nestjs/common';
import { UpdateHistoryRepository } from '../repositories/rooms.repository';
import { UpdateHistory } from '../entities/rooms.entity';

import { AuditActionType } from '@prisma/client';
import { DeleteUpdateHistoryDto } from '../dto/delete-up-history.dto';

import { UserData } from 'src/interfaces';
import { AuditService } from '../../audit/audit.service';
import { BaseApiResponse } from 'src/utils/base-response/BaseApiResponse.dto';

@Injectable()
export class DeleteUpdateHistoriesUseCase {
  constructor(
    private readonly updateHistoryRepository: UpdateHistoryRepository,
    private readonly auditService: AuditService,
  ) {}

  async execute(
    deleteUpdateHistoriesDto: DeleteUpdateHistoryDto,
    user: UserData,
  ): Promise<BaseApiResponse<UpdateHistory[]>> {
    const deletedUpdateHistories =
      await this.updateHistoryRepository.transaction(async () => {
        // Realiza el soft delete y obtiene las historias actualizadas
        const updateHistories =
          await this.updateHistoryRepository.softDeleteMany(
            deleteUpdateHistoriesDto.ids,
          );

        // Registra la auditoría para cada historia eliminada
        await Promise.all(
          updateHistories.map((updateHistory) =>
            this.auditService.create({
              entityId: updateHistory.id,
              entityType: 'updateHistory',
              action: AuditActionType.DELETE,
              performedById: user.id,
              createdAt: new Date(),
            }),
          ),
        );

        return updateHistories;
      });

    return {
      success: true,
      message: 'Actualizaciones de historia médica eliminadas exitosamente',
      data: deletedUpdateHistories,
    };
  }
}
