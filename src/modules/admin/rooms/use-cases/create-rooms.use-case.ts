import { Injectable } from '@nestjs/common';
import { CreateRoomDto } from '../dto/create-rooms.dto';
import { Room } from '../entities/rooms.entity';
import { RoomsRepository } from '../repositories/rooms.repository';
import { AuditActionType } from '@prisma/client';
import { UserData } from 'src/interfaces';
import { AuditService } from '../../audit/audit.service';
import { BaseApiResponse } from 'src/utils/base-response/BaseApiResponse.dto';

@Injectable()
export class CreateRoomUseCase {
  constructor(
    private readonly roomsRepository: RoomsRepository,
    private readonly auditService: AuditService,
  ) {}

  async execute(
    createRoomDto: CreateRoomDto,
    user: UserData,
  ): Promise<BaseApiResponse<Room>> {
    const newRoom = await this.roomsRepository.transaction(async () => {
      // Crear habitación
      const room = await this.roomsRepository.create({
        number: createRoomDto.number,
        guests: createRoomDto.guests,
        type: createRoomDto.type,
        price: createRoomDto.price,
        status: createRoomDto.status,
        tv: createRoomDto.tv,
        floorType: createRoomDto.floorType,
        description: createRoomDto.description,
        area: createRoomDto.area,
        bed: createRoomDto.bed,
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
