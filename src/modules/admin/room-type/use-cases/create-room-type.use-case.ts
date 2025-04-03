import { Injectable } from '@nestjs/common';
import { CreateRoomTypeDto } from '../dto/create-room-type.dto';
import { RoomType } from '../entities/room-type.entity';
import { RoomTypeRepository } from '../repositories/room-type.repository';
import { AuditActionType } from '@prisma/client';
import { UserData } from 'src/interfaces';
import { AuditService } from '../../audit/audit.service';
import { BaseApiResponse } from 'src/utils/base-response/BaseApiResponse.dto';

@Injectable()
export class CreateRoomTypeUseCase {
  constructor(
    private readonly roomTypeRepository: RoomTypeRepository,
    private readonly auditService: AuditService,
  ) {}

  async execute(
    createRoomTypeDto: CreateRoomTypeDto,
    user: UserData,
  ): Promise<BaseApiResponse<RoomType>> {
    const newRoomType = await this.roomTypeRepository.transaction(async () => {
      // Crear tipo de habitación
      const roomType = await this.roomTypeRepository.create({
        name: createRoomTypeDto.name,
        guests: createRoomTypeDto.guests,
        price: createRoomTypeDto.price,
        description: createRoomTypeDto.description,
        bed: createRoomTypeDto.bed,
      });

      // Registrar auditoría
      await this.auditService.create({
        entityId: roomType.id,
        entityType: 'roomType',
        action: AuditActionType.CREATE,
        performedById: user.id,
        createdAt: new Date(),
      });

      return roomType;
    });

    return {
      success: true,
      message: 'Tipo de habitación creado exitosamente',
      data: newRoomType,
    };
  }
}
