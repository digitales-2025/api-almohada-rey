import { Injectable } from '@nestjs/common';
import { UpdateUpdateHistoryDto } from '../dto/update-up-history.dto';
import { UpdateHistory } from '../entities/rooms.entity';
import { UpdateHistoryRepository } from '../repositories/rooms.repository';
import { AuditActionType } from '@prisma/client';
import { UserData } from 'src/interfaces';
import { AuditService } from '../../audit/audit.service';
import { BaseApiResponse } from 'src/utils/base-response/BaseApiResponse.dto';

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
