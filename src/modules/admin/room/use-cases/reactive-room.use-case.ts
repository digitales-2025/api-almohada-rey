import { Injectable } from '@nestjs/common';
import { PrescriptionRepository } from '../repositories/room.repository';
import { AuditService } from '@login/login/admin/audit/audit.service';
import { AuditActionType } from '@prisma/client';
import { UserData } from '@login/login/interfaces';
import { Prescription } from '../entities/room.entity';
import { BaseApiResponse } from 'src/dto/BaseApiResponse.dto';

@Injectable()
export class ReactivatePrescriptionUseCase {
  constructor(
    private readonly prescriptionRepository: PrescriptionRepository,
    private readonly auditService: AuditService,
  ) {}

  async execute(
    ids: string[],
    user: UserData,
  ): Promise<BaseApiResponse<Prescription[]>> {
    // Reactivar las recetas y registrar auditoría
    const reactivatedPrescriptions =
      await this.prescriptionRepository.transaction(async () => {
        const prescriptions =
          await this.prescriptionRepository.reactivateMany(ids);

        // Registrar auditoría para cada receta reactivada
        await Promise.all(
          prescriptions.map((prescription) =>
            this.auditService.create({
              entityId: prescription.id,
              entityType: 'prescription',
              action: AuditActionType.UPDATE,
              performedById: user.id,
              createdAt: new Date(),
            }),
          ),
        );

        return prescriptions;
      });

    return {
      success: true,
      message: 'Recetas médicas reactivadas exitosamente',
      data: reactivatedPrescriptions,
    };
  }
}
