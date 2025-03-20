import { Injectable } from '@nestjs/common';
import { UpdateUpdateHistoryDto } from '../dto/update-up-history.dto';
import { UpdateHistory } from '../entities/up-history.entity';
import { UpdateHistoryRepository } from '../repositories/up-history.repository';
import { UserData } from '@login/login/interfaces';
import { AuditService } from '@login/login/admin/audit/audit.service';
import { AuditActionType } from '@prisma/client';
import { BaseApiResponse } from 'src/dto/BaseApiResponse.dto';

@Injectable()
export class UpdateUpdateHistoryUseCase {
  constructor(
    private readonly updateHistoryRepository: UpdateHistoryRepository,
    private readonly auditService: AuditService,
  ) {}

  async execute(
    id: string,
    updateUpdateHistoryDto: UpdateUpdateHistoryDto,
    user: UserData,
  ): Promise<BaseApiResponse<UpdateHistory>> {
    const updatedUpdateHistory = await this.updateHistoryRepository.transaction(
      async () => {
        // Update update history
        const updateHistory = await this.updateHistoryRepository.update(id, {
          serviceId: updateUpdateHistoryDto.serviceId,
          patientId: updateUpdateHistoryDto.patientId,
          staffId: updateUpdateHistoryDto.staffId,
          branchId: updateUpdateHistoryDto.branchId,
          medicalHistoryId: updateUpdateHistoryDto.medicalHistoryId,
          prescription: updateUpdateHistoryDto.prescription,
          prescriptionId: updateUpdateHistoryDto.prescriptionId,
          updateHistory: updateUpdateHistoryDto.updateHistory,
          description: updateUpdateHistoryDto.description,
          medicalLeave: updateUpdateHistoryDto.medicalLeave,
          medicalLeaveStartDate: updateUpdateHistoryDto.medicalLeaveStartDate,
          medicalLeaveEndDate: updateUpdateHistoryDto.medicalLeaveEndDate,
          medicalLeaveDays: updateUpdateHistoryDto.medicalLeaveDays,
          leaveDescription: updateUpdateHistoryDto.leaveDescription,
        });

        // Register audit
        await this.auditService.create({
          entityId: updateHistory.id,
          entityType: 'updateHistory',
          action: AuditActionType.UPDATE,
          performedById: user.id,
          createdAt: new Date(),
        });

        return updateHistory;
      },
    );

    return {
      success: true,
      message: 'Actualización de historia médica actualizada exitosamente',
      data: updatedUpdateHistory,
    };
  }
}
