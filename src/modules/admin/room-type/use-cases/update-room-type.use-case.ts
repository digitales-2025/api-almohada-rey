import { Injectable } from '@nestjs/common';
import { UpdateRoomTypeDto } from '../dto/update-room-type.dto';
import { RoomType } from '../entities/room-type.entity';
import { RoomTypeRepository } from '../repositories/room-type.repository';
import { AuditActionType } from '@prisma/client';
import { UserData } from 'src/interfaces';
import { AuditService } from '../../audit/audit.service';
import { BaseApiResponse } from 'src/utils/base-response/BaseApiResponse.dto';

@Injectable()
export class UpdateRoomTypeUseCase {
  constructor(
    private readonly roomTypeRepository: RoomTypeRepository,
    private readonly auditService: AuditService,
  ) {}

  async execute(
    id: string,
    updateRoomTypeDto: UpdateRoomTypeDto,
    user: UserData,
  ): Promise<BaseApiResponse<RoomType>> {
    const updatedRoomType = await this.roomTypeRepository.transaction(
      async () => {
        // Actualizar tipo de habitación
        const roomType = await this.roomTypeRepository.update(id, {
          guests: updateRoomTypeDto.guests,
          nameEn: updateRoomTypeDto.nameEn,
          price: updateRoomTypeDto.price,
          description: updateRoomTypeDto.description,
          descriptionEn: updateRoomTypeDto.descriptionEn,
          bed: updateRoomTypeDto.bed,
          bedEn: updateRoomTypeDto.bedEn,
          name: updateRoomTypeDto.name,
        });

        // Registrar auditoría
        await this.auditService.create({
          entityId: roomType.id,
          entityType: 'roomType',
          action: AuditActionType.UPDATE,
          performedById: user.id,
          createdAt: new Date(),
        });

        return roomType;
      },
    );

    return {
      success: true,
      message: 'Tipo de habitación actualizado exitosamente',
      data: updatedRoomType,
    };
  }
}
