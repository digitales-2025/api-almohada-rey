import { Injectable } from '@nestjs/common';
import { PrescriptionRepository } from '../repositories/room.repository';
import { Prescription } from '../entities/room.entity';
import { UserData } from '@login/login/interfaces';
import { AuditService } from '@login/login/admin/audit/audit.service';
import { AuditActionType } from '@prisma/client';
import { DeletePrescriptionDto } from '../dto/delete-room.dto';
import { BaseApiResponse } from 'src/dto/BaseApiResponse.dto';

@Injectable()
export class DeletePrescriptionsUseCase {
  constructor(
    private readonly prescriptionRepository: PrescriptionRepository,
    private readonly auditService: AuditService,
  ) {}

  async execute(
    deletePrescriptionsDto: DeletePrescriptionDto,
    user: UserData,
  ): Promise<BaseApiResponse<Prescription[]>> {
    const deletedPrescriptions = await this.prescriptionRepository.transaction(
      async () => {
        // Perform soft delete and get updated prescriptions
        const prescriptions = await this.prescriptionRepository.softDeleteMany(
          deletePrescriptionsDto.ids,
        );

        // Register audit for each deleted prescription
        await Promise.all(
          prescriptions.map((prescription) =>
            this.auditService.create({
              entityId: prescription.id,
              entityType: 'prescription',
              action: AuditActionType.DELETE,
              performedById: user.id,
              createdAt: new Date(),
            }),
          ),
        );

        return prescriptions;
      },
    );

    return {
      success: true,
      message: 'Recetas médicas eliminadas exitosamente',
      data: deletedPrescriptions,
    };
  }
}
