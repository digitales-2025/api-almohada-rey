import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsEnum } from 'class-validator';
import { RoomStatus } from '../entities/room.entity';
import { RoomStatus as RoomStatusPrisma } from '@prisma/client';

export class StatusRoomDto {
  @ApiProperty({
    description: 'Disponible, ocupada o reservada',
    enum: RoomStatus,
    example: 'AVAILABLE',
    required: true,
  })
  @IsEnum(RoomStatus)
  @IsNotEmpty()
  status: RoomStatusPrisma;
}
