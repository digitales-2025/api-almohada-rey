import { Injectable } from '@nestjs/common';
import { ServiceUpdateDto } from '../dto/update-service.dto';
import { Service } from '../entities/service.entity';
import { ServiceRepository } from '../repositories/service.repository';
import { AuditActionType } from '@prisma/client';
import { UserData } from 'src/interfaces';
import { AuditService } from '../../audit/audit.service';
import { BaseApiResponse } from 'src/utils/base-response/BaseApiResponse.dto';

@Injectable()
export class UpdateServiceUseCase {
  constructor(
    private readonly serviceRepository: ServiceRepository,
    private readonly auditService: AuditService,
  ) {}

  async execute(
    id: string,
    updateServiceDto: ServiceUpdateDto,
    user: UserData,
  ): Promise<BaseApiResponse<Service>> {
    const updatedService = await this.serviceRepository.transaction(
      async () => {
        // Actualizar servicio
        const service = await this.serviceRepository.update(id, {
          name: updateServiceDto.name,
          description: updateServiceDto.description,
          price: updateServiceDto.price,
        });

        // Registrar auditoría
        await this.auditService.create({
          entityId: service.id,
          entityType: 'service',
          action: AuditActionType.UPDATE,
          performedById: user.id,
          createdAt: new Date(),
        });

        return service;
      },
    );

    return {
      success: true,
      message: 'Servicio actualizado exitosamente',
      data: updatedService,
    };
  }
}
