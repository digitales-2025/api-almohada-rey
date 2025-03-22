import { Injectable } from '@nestjs/common';
import { RoomTypeRepository } from '../repositories/room-type.repository';
import { RoomType } from '../entities/room-type.entity';
import { AuditActionType } from '@prisma/client';
import { UserData } from 'src/interfaces';
import { AuditService } from '../../audit/audit.service';
import { BaseApiResponse } from 'src/utils/base-response/BaseApiResponse.dto';

@Injectable()
export class ReactivateRoomTypeUseCase {
  constructor(
    private readonly roomTypeRepository: RoomTypeRepository,
    private readonly auditService: AuditService,
  ) {}

  async execute(
    ids: string[],
    user: UserData,
  ): Promise<BaseApiResponse<RoomType[]>> {
    // Reactivar los tipos de habitación y registrar auditoría
    const reactivatedRoomTypes = await this.roomTypeRepository.transaction(
      async () => {
        const roomTypes = await this.roomTypeRepository.reactivateMany(ids);

        // Registrar auditoría para cada tipo de habitación reactivado
        await Promise.all(
          roomTypes.map((roomType) =>
            this.auditService.create({
              entityId: roomType.id,
              entityType: 'roomType',
              action: AuditActionType.UPDATE,
              performedById: user.id,
              createdAt: new Date(),
            }),
          ),
        );

        return roomTypes;
      },
    );

    return {
      success: true,
      message: 'Tipos de habitación reactivados exitosamente',
      data: reactivatedRoomTypes,
    };
  }
}
