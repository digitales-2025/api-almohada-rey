import { Injectable } from '@nestjs/common';
import { CleaningChecklistRepository } from '../repositories/room-clean.repository';
import { CleaningChecklist } from '../entities/room-clean.entity';
import { AuditActionType } from '@prisma/client';
import { UserData } from 'src/interfaces';
import { AuditService } from '../../audit/audit.service';
import { BaseApiResponse } from 'src/utils/base-response/BaseApiResponse.dto';

@Injectable()
export class ReactivateCleaningChecklistUseCase {
  constructor(
    private readonly cleaningRepository: CleaningChecklistRepository,
    private readonly auditService: AuditService,
  ) {}

  async execute(
    ids: string[],
    user: UserData,
  ): Promise<BaseApiResponse<CleaningChecklist[]>> {
    // Reactivar los registros de limpieza y registrar auditoría
    const reactivatedRecords = await this.cleaningRepository.transaction(
      async () => {
        const records = await this.cleaningRepository.reactivateMany(ids);

        // Registrar auditoría para cada registro reactivado
        await Promise.all(
          records.map((record) =>
            this.auditService.create({
              entityId: record.id,
              entityType: 'cleaningChecklist',
              action: AuditActionType.REACTIVATE,
              performedById: user.id,
              createdAt: new Date(),
            }),
          ),
        );

        return records;
      },
    );

    return {
      success: true,
      message: 'Registros de limpieza reactivados exitosamente',
      data: reactivatedRecords,
    };
  }
}
