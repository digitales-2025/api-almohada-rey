import { Injectable } from '@nestjs/common';
import { CleaningChecklistRepository } from '../repositories/room-clean.repository';
import { CleaningChecklist } from '../entities/room-clean.entity';
import { AuditActionType } from '@prisma/client';
import { DeleteCleaningChecklistDto } from '../dto/delete-room-clean.dto';
import { UserData } from 'src/interfaces';
import { AuditService } from '../../audit/audit.service';
import { BaseApiResponse } from 'src/utils/base-response/BaseApiResponse.dto';

@Injectable()
export class DeleteCleaningChecklistUseCase {
  constructor(
    private readonly cleaningRepository: CleaningChecklistRepository,
    private readonly auditService: AuditService,
  ) {}

  async execute(
    deleteCleaningDto: DeleteCleaningChecklistDto,
    user: UserData,
  ): Promise<BaseApiResponse<CleaningChecklist[]>> {
    const deletedRecords = await this.cleaningRepository.transaction(
      async () => {
        // Realizar soft delete y obtener registros actualizados
        const records = await this.cleaningRepository.softDeleteMany(
          deleteCleaningDto.ids,
        );

        // Registrar auditoría para cada registro eliminado
        await Promise.all(
          records.map((record) =>
            this.auditService.create({
              entityId: record.id,
              entityType: 'cleaningChecklist',
              action: AuditActionType.DELETE,
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
      message: 'Registros de limpieza desactivados exitosamente',
      data: deletedRecords,
    };
  }
}
