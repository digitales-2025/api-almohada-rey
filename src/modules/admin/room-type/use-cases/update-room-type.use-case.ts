import { Injectable } from '@nestjs/common';
import { UpdateRoomDto } from '../dto/update-room-type.dto';
import { Room } from '../entities/room-type.entity';
import { RoomsRepository } from '../repositories/room-type.repository';
import { AuditActionType } from '@prisma/client';
import { UserData } from 'src/interfaces';
import { AuditService } from '../../audit/audit.service';
import { BaseApiResponse } from 'src/utils/base-response/BaseApiResponse.dto';

@Injectable()
export class UpdateRoomUseCase {
  constructor(
    private readonly roomsRepository: RoomsRepository,
    private readonly auditService: AuditService,
  ) {}

  async execute(
    id: string,
    updateRoomDto: UpdateRoomDto,
    user: UserData,
  ): Promise<BaseApiResponse<Room>> {
    const updatedRoom = await this.roomsRepository.transaction(async () => {
      // Actualizar habitación
      const room = await this.roomsRepository.update(id, {
        number: updateRoomDto.number,
        guests: updateRoomDto.guests,
        type: updateRoomDto.type,
        price: updateRoomDto.price,
        status: updateRoomDto.status,
        tv: updateRoomDto.tv,
        floorType: updateRoomDto.floorType,
        description: updateRoomDto.description,
        area: updateRoomDto.area,
        bed: updateRoomDto.bed,
      });

      // Registrar auditoría
      await this.auditService.create({
        entityId: room.id,
        entityType: 'room',
        action: AuditActionType.UPDATE,
        performedById: user.id,
        createdAt: new Date(),
      });

      return room;
    });

    return {
      success: true,
      message: 'Habitación actualizada exitosamente',
      data: updatedRoom,
    };
  }
}
