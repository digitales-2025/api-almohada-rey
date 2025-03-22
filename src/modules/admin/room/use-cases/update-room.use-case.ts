import { Injectable } from '@nestjs/common';
import { UpdatePrescriptionDto } from '../dto/update-room.dto';
import { Prescription } from '../entities/room.entity';
import { PrescriptionRepository } from '../repositories/room.repository';
import { UserData } from '@login/login/interfaces';
import { AuditService } from '@login/login/admin/audit/audit.service';
import { AuditActionType } from '@prisma/client';
import { BaseApiResponse } from 'src/dto/BaseApiResponse.dto';

@Injectable()
export class UpdatePrescriptionUseCase {
  constructor(
    private readonly prescriptionRepository: PrescriptionRepository,
    private readonly auditService: AuditService,
  ) {}

  async execute(
    id: string,
    updatePrescriptionDto: UpdatePrescriptionDto,
    user: UserData,
  ): Promise<BaseApiResponse<Prescription>> {
    const updatedPrescription = await this.prescriptionRepository.transaction(
      async () => {
        // Update prescription
        const prescription = await this.prescriptionRepository.update(id, {
          updateHistoryId: updatePrescriptionDto.updateHistoryId,
          branchId: updatePrescriptionDto.branchId,
          staffId: updatePrescriptionDto.staffId,
          patientId: updatePrescriptionDto.patientId,
          registrationDate: updatePrescriptionDto.registrationDate,
          prescriptionMedicaments:
            updatePrescriptionDto.prescriptionMedicaments,
          prescriptionServices: updatePrescriptionDto.prescriptionServices,
          description: updatePrescriptionDto.description,
          purchaseOrderId: updatePrescriptionDto.purchaseOrderId,
          isActive: true,
        });

        // Register audit
        await this.auditService.create({
          entityId: prescription.id,
          entityType: 'prescription',
          action: AuditActionType.UPDATE,
          performedById: user.id,
          createdAt: new Date(),
        });

        return prescription;
      },
    );

    return {
      success: true,
      message: 'Receta médica actualizada exitosamente',
      data: updatedPrescription,
    };
  }
}
