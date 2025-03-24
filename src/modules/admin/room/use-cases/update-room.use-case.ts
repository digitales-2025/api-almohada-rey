import { Injectable } from '@nestjs/common';
import { UpdateRoomDto } from '../dto/update-room.dto';
import { Room } from '../entities/room.entity';
import { RoomRepository } from '../repositories/room.repository';
import { AuditActionType } from '@prisma/client';
import { UserData } from 'src/interfaces';
import { AuditService } from '../../audit/audit.service';
import { BaseApiResponse } from 'src/utils/base-response/BaseApiResponse.dto';

@Injectable()
export class UpdateRoomUseCase {
  constructor(
    private readonly roomRepository: RoomRepository,
    private readonly auditService: AuditService,
  ) {}

  async execute(
    id: string,
    updateRoomDto: UpdateRoomDto,
    user: UserData,
  ): Promise<BaseApiResponse<Room>> {
    const updatedRoom = await this.roomRepository.transaction(async () => {
      // Actualizar habitación
      const room = await this.roomRepository.update(id, {
        type: updateRoomDto.type,
        number: updateRoomDto.number,
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
