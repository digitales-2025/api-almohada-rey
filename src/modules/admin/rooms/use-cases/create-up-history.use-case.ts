import { Injectable } from '@nestjs/common';
import { CreateUpdateHistoryDto } from '../dto/create-up-history.dto';
import { UpdateHistory } from '../entities/up-history.entity';
import { UpdateHistoryRepository } from '../repositories/up-history.repository';
import { UserData } from '@login/login/interfaces';
import { AuditService } from '@login/login/admin/audit/audit.service';
import { AuditActionType } from '@prisma/client';
import { BaseApiResponse } from 'src/dto/BaseApiResponse.dto';

@Injectable()
export class CreateUpdateHistoryUseCase {
  constructor(
    private readonly updateHistoryRepository: UpdateHistoryRepository,
    private readonly auditService: AuditService,
  ) {}

  async execute(
    createUpdateHistoryDto: CreateUpdateHistoryDto,
    user: UserData,
  ): Promise<BaseApiResponse<UpdateHistory>> {
    const newUpdateHistory = await this.updateHistoryRepository.transaction(
      async () => {
        // Create update history
        const updateHistory = await this.updateHistoryRepository.create({
          serviceId: createUpdateHistoryDto.serviceId,
          patientId: createUpdateHistoryDto.patientId,
          staffId: createUpdateHistoryDto.staffId,
          branchId: createUpdateHistoryDto.branchId,
          medicalHistoryId: createUpdateHistoryDto.medicalHistoryId,
          prescription: createUpdateHistoryDto.prescription,
          prescriptionId: createUpdateHistoryDto.prescriptionId,
          updateHistory: createUpdateHistoryDto.updateHistory,
          description: createUpdateHistoryDto.description,
          medicalLeave: createUpdateHistoryDto.medicalLeave,
          medicalLeaveStartDate: createUpdateHistoryDto.medicalLeaveStartDate,
          medicalLeaveEndDate: createUpdateHistoryDto.medicalLeaveEndDate,
          medicalLeaveDays: createUpdateHistoryDto.medicalLeaveDays,
          leaveDescription: createUpdateHistoryDto.leaveDescription,
          isActive: true,
        });

        // Register audit
        await this.auditService.create({
          entityId: updateHistory.id,
          entityType: 'updateHistory',
          action: AuditActionType.CREATE,
          performedById: user.id,
          createdAt: new Date(),
        });

        return updateHistory;
      },
    );

    return {
      success: true,
      message: 'Actualización de historia médica creada exitosamente',
      data: newUpdateHistory,
    };
  }
}
