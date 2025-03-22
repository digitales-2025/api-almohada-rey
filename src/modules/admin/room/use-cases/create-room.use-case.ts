import { Injectable } from '@nestjs/common';
import { CreatePrescriptionDto } from '../dto/create-room.dto';
import { Prescription } from '../entities/room.entity';
import { PrescriptionRepository } from '../repositories/room.repository';
import { UserData } from '@login/login/interfaces';
import { AuditService } from '@login/login/admin/audit/audit.service';
import { AuditActionType } from '@prisma/client';
import { BaseApiResponse } from 'src/dto/BaseApiResponse.dto';

@Injectable()
export class CreatePrescriptionUseCase {
  constructor(
    private readonly prescriptionRepository: PrescriptionRepository,
    private readonly auditService: AuditService,
  ) {}

  async execute(
    createPrescriptionDto: CreatePrescriptionDto,
    user: UserData,
  ): Promise<BaseApiResponse<Prescription>> {
    console.log(
      '🚀 ~ CreatePrescriptionUseCase ~ createPrescriptionDto:',
      createPrescriptionDto,
    );
    const newPrescription = await this.prescriptionRepository.transaction(
      async () => {
        // Create prescription
        const prescription = await this.prescriptionRepository.create({
          updateHistoryId: createPrescriptionDto.updateHistoryId,
          branchId: createPrescriptionDto.branchId,
          staffId: createPrescriptionDto.staffId,
          patientId: createPrescriptionDto.patientId,
          registrationDate: createPrescriptionDto.registrationDate,
          prescriptionMedicaments:
            createPrescriptionDto.prescriptionMedicaments,
          prescriptionServices: createPrescriptionDto.prescriptionServices,
          description: createPrescriptionDto.description,
          purchaseOrderId: createPrescriptionDto.purchaseOrderId,
          isActive: true,
        });

        // Register audit
        await this.auditService.create({
          entityId: prescription.id,
          entityType: 'prescription',
          action: AuditActionType.CREATE,
          performedById: user.id,
          createdAt: new Date(),
        });

        return prescription;
      },
    );

    return {
      success: true,
      message: 'Receta médica creada exitosamente',
      data: newPrescription,
    };
  }
}
