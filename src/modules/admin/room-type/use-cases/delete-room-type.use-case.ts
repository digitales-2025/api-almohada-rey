import { Injectable } from '@nestjs/common';
import { RoomTypeRepository } from '../repositories/room-type.repository';
import { RoomType } from '../entities/room-type.entity';

import { AuditActionType } from '@prisma/client';
import { DeleteRoomTypeDto } from '../dto/delete-room-type.dto';

import { UserData } from 'src/interfaces';
import { AuditService } from '../../audit/audit.service';
import { BaseApiResponse } from 'src/utils/base-response/BaseApiResponse.dto';

@Injectable()
export class DeleteRoomTypesUseCase {
  constructor(
    private readonly roomTypeRepository: RoomTypeRepository,
    private readonly auditService: AuditService,
  ) {}

  async execute(
    deleteRoomTypeDto: DeleteRoomTypeDto,
    user: UserData,
  ): Promise<BaseApiResponse<RoomType[]>> {
    const deletedRoomTypes = await this.roomTypeRepository.transaction(
      async () => {
        // Realiza el soft delete y obtiene los tipos de habitación desactivados
        const roomTypes = await this.roomTypeRepository.softDeleteMany(
          deleteRoomTypeDto.ids,
        );

        // Registra la auditoría para cada tipo de habitación eliminado
        await Promise.all(
          roomTypes.map((roomType) =>
            this.auditService.create({
              entityId: roomType.id,
              entityType: 'roomType',
              action: AuditActionType.DELETE,
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
      message: 'Tipos de habitación desactivados exitosamente',
      data: deletedRoomTypes,
    };
  }
}
