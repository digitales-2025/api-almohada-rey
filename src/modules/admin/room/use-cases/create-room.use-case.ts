import { Injectable } from '@nestjs/common';
import { CreateRoomDto } from '../dto/create-room.dto';
import { Room, RoomStatus } from '../entities/room.entity';
import { RoomRepository } from '../repositories/room.repository';
import { AuditActionType } from '@prisma/client';
import { UserData } from 'src/interfaces';
import { AuditService } from '../../audit/audit.service';
import { BaseApiResponse } from 'src/utils/base-response/BaseApiResponse.dto';

@Injectable()
export class CreateRoomUseCase {
  constructor(
    private readonly roomRepository: RoomRepository,
    private readonly auditService: AuditService,
  ) {}

  async execute(
    createRoomDto: CreateRoomDto,
    user: UserData,
  ): Promise<BaseApiResponse<Room>> {
    const newRoom = await this.roomRepository.transaction(async () => {
      // Crear habitación
      const room = await this.roomRepository.create({
        type: createRoomDto.type,
        number: createRoomDto.number,
        status: RoomStatus.AVAILABLE, // Por defecto, habitaciones nuevas están disponibles
        trashBin: true,
        towel: true,
        toiletPaper: true,
        showerSoap: true,
        handSoap: true,
        lamp: true,
        isActive: true,
      });

      // Registrar auditoría
      await this.auditService.create({
        entityId: room.id,
        entityType: 'room',
        action: AuditActionType.CREATE,
        performedById: user.id,
        createdAt: new Date(),
      });

      return room;
    });

    return {
      success: true,
      message: 'Habitación creada exitosamente',
      data: newRoom,
    };
  }
}
