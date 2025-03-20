import { Injectable } from '@nestjs/common';
import { UpdateHistoryRepository } from '../repositories/up-history.repository';
import { UpdateHistory } from '../entities/up-history.entity';
import { UserData } from '@login/login/interfaces';
import { AuditService } from '@login/login/admin/audit/audit.service';
import { AuditActionType } from '@prisma/client';
import { BaseApiResponse } from 'src/dto/BaseApiResponse.dto';

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
