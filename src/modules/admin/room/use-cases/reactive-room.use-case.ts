import { Injectable } from '@nestjs/common';
import { RoomRepository } from '../repositories/room.repository';
import { Room } from '../entities/room.entity';
import { AuditActionType } from '@prisma/client';
import { UserData } from 'src/interfaces';
import { AuditService } from '../../audit/audit.service';
import { BaseApiResponse } from 'src/utils/base-response/BaseApiResponse.dto';

@Injectable()
export class ReactivateRoomUseCase {
  constructor(
    private readonly roomRepository: RoomRepository,
    private readonly auditService: AuditService,
  ) {}

  async execute(
    ids: string[],
    user: UserData,
  ): Promise<BaseApiResponse<Room[]>> {
    // Reactivar las habitaciones y registrar auditoría
    const reactivatedRooms = await this.roomRepository.transaction(async () => {
      const rooms = await this.roomRepository.reactivateMany(ids);

      // Registrar auditoría para cada habitación reactivada
      await Promise.all(
        rooms.map((room) =>
          this.auditService.create({
            entityId: room.id,
            entityType: 'room',
            action: AuditActionType.UPDATE,
            performedById: user.id,
            createdAt: new Date(),
          }),
        ),
      );

      return rooms;
    });

    return {
      success: true,
      message: 'Habitaciones reactivadas exitosamente',
      data: reactivatedRooms,
    };
  }
}
