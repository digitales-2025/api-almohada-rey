import { Injectable } from '@nestjs/common';
import { RoomsRepository } from '../repositories/room-type.repository';
import { Room } from '../entities/room-type.entity';

import { AuditActionType } from '@prisma/client';
import { DeleteRoomDto } from '../dto/delete-room-type.dto';

import { UserData } from 'src/interfaces';
import { AuditService } from '../../audit/audit.service';
import { BaseApiResponse } from 'src/utils/base-response/BaseApiResponse.dto';

@Injectable()
export class DeleteRoomsUseCase {
  constructor(
    private readonly roomsRepository: RoomsRepository,
    private readonly auditService: AuditService,
  ) {}

  async execute(
    deleteRoomDto: DeleteRoomDto,
    user: UserData,
  ): Promise<BaseApiResponse<Room[]>> {
    const deletedRooms = await this.roomsRepository.transaction(async () => {
      // Realiza el soft delete y obtiene las habitaciones desactivadas
      const rooms = await this.roomsRepository.softDeleteMany(
        deleteRoomDto.ids,
      );

      // Registra la auditoría para cada habitación eliminada
      await Promise.all(
        rooms.map((room) =>
          this.auditService.create({
            entityId: room.id,
            entityType: 'room',
            action: AuditActionType.DELETE,
            performedById: user.id,
            createdAt: new Date(),
          }),
        ),
      );

      return rooms;
    });

    return {
      success: true,
      message: 'Habitaciones desactivadas exitosamente',
      data: deletedRooms,
    };
  }
}
