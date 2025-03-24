import { Injectable } from '@nestjs/common';
import { RoomRepository } from '../repositories/room.repository';
import { Room } from '../entities/room.entity';
import { AuditActionType } from '@prisma/client';
import { DeleteRoomDto } from '../dto/delete-room.dto';
import { UserData } from 'src/interfaces';
import { AuditService } from '../../audit/audit.service';
import { BaseApiResponse } from 'src/utils/base-response/BaseApiResponse.dto';

@Injectable()
export class DeleteRoomsUseCase {
  constructor(
    private readonly roomRepository: RoomRepository,
    private readonly auditService: AuditService,
  ) {}

  async execute(
    deleteRoomDto: DeleteRoomDto,
    user: UserData,
  ): Promise<BaseApiResponse<Room[]>> {
    const deletedRooms = await this.roomRepository.transaction(async () => {
      // Realizar soft delete y obtener habitaciones actualizadas
      const rooms = await this.roomRepository.softDeleteMany(deleteRoomDto.ids);

      // Registrar auditoría para cada habitación eliminada
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
