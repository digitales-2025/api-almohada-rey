import { Injectable } from '@nestjs/common';
import { UpdateHistoryRepository } from '../repositories/rooms.repository';
import { UpdateHistory } from '../entities/rooms.entity';
import { AuditActionType } from '@prisma/client';
import { UserData } from 'src/interfaces';
import { AuditService } from '../../audit/audit.service';
import { BaseApiResponse } from 'src/utils/base-response/BaseApiResponse.dto';

@Injectable()
export class ReactivateUpdateHistoryUseCase {
  constructor(
    private readonly updateHistoryRepository: UpdateHistoryRepository,
    private readonly auditService: AuditService,
  ) {}

  async execute(
    ids: string[],
    user: UserData,
  ): Promise<BaseApiResponse<UpdateHistory[]>> {
    // Reactivar las historias y registrar auditoría
    const reactivatedUpdateHistories =
      await this.updateHistoryRepository.transaction(async () => {
        const updateHistories =
          await this.updateHistoryRepository.reactivateMany(ids);

        // Registrar auditoría para cada historia reactivada
        await Promise.all(
          updateHistories.map((updateHistory) =>
            this.auditService.create({
              entityId: updateHistory.id,
              entityType: 'updateHistory',
              action: AuditActionType.UPDATE,
              performedById: user.id,
              createdAt: new Date(),
            }),
          ),
        );

        return updateHistories;
      });

    return {
      success: true,
      message: 'Actualizaciones de historia médica reactivadas exitosamente',
      data: reactivatedUpdateHistories,
    };
  }
}
