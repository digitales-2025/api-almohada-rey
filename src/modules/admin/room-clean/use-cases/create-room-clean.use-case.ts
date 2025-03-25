import { Injectable } from '@nestjs/common';
import { CreateCleaningChecklistDto } from '../dto';
import { CleaningChecklist } from '../entities/room-clean.entity';
import { CleaningChecklistRepository } from '../repositories/room-clean.repository';
import { AuditActionType } from '@prisma/client';
import { UserData } from 'src/interfaces';
import { AuditService } from '../../audit/audit.service';
import { BaseApiResponse } from 'src/utils/base-response/BaseApiResponse.dto';

@Injectable()
export class CreateCleaningChecklistUseCase {
  constructor(
    private readonly cleaningRepository: CleaningChecklistRepository,
    private readonly auditService: AuditService,
  ) {}

  async execute(
    createCleaningDto: CreateCleaningChecklistDto,
    user: UserData,
  ): Promise<BaseApiResponse<CleaningChecklist>> {
    const cleaningRecord = await this.cleaningRepository.create({
      date: createCleaningDto.date,
      roomId: createCleaningDto.roomId,
      staffName: createCleaningDto.staffName,
      userCheckId: createCleaningDto.userCheckId,
      observations: createCleaningDto.observations || null,
    });

    // Registrar auditoría
    await this.auditService.create({
      entityId: cleaningRecord.id,
      entityType: 'cleaningChecklist',
      action: AuditActionType.CREATE,
      performedById: user.id,
      createdAt: new Date(),
    });

    return {
      success: true,
      message:
        'Registro de limpieza creado exitosamente y habitación marcada como disponible',
      data: cleaningRecord,
    };
  }
}
