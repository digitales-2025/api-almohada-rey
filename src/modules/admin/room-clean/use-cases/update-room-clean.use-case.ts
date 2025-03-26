import { Injectable } from '@nestjs/common';
import { UpdateCleaningChecklistDto } from '../dto';
import { CleaningChecklist } from '../entities/room-clean.entity';
import { CleaningChecklistRepository } from '../repositories/room-clean.repository';
import { AuditActionType } from '@prisma/client';
import { UserData } from 'src/interfaces';
import { AuditService } from '../../audit/audit.service';
import { BaseApiResponse } from 'src/utils/base-response/BaseApiResponse.dto';

@Injectable()
export class UpdateCleaningChecklistUseCase {
  constructor(
    private readonly cleaningRepository: CleaningChecklistRepository,
    private readonly auditService: AuditService,
  ) {}

  async execute(
    id: string,
    updateCleaningDto: UpdateCleaningChecklistDto,
    user: UserData,
  ): Promise<BaseApiResponse<CleaningChecklist>> {
    const updatedCleaningRecord = await this.cleaningRepository.transaction(
      async () => {
        // Actualizar registro de limpieza
        const cleaningRecord = await this.cleaningRepository.update(id, {
          date: updateCleaningDto.date,
          roomId: updateCleaningDto.roomId,
          staffName: updateCleaningDto.staffName,
          userCheckId: updateCleaningDto.userCheckId,
          observations: updateCleaningDto.observations,
        });

        // Registrar auditoría
        await this.auditService.create({
          entityId: cleaningRecord.id,
          entityType: 'cleaningChecklist',
          action: AuditActionType.UPDATE,
          performedById: user.id,
          createdAt: new Date(),
        });

        return cleaningRecord;
      },
    );

    return {
      success: true,
      message: 'Registro de limpieza actualizado exitosamente',
      data: updatedCleaningRecord,
    };
  }
}
