import { ApiProperty } from '@nestjs/swagger';
import { RoomStatus as RoomStatusPrisma } from '@prisma/client';
import { BaseEntity } from 'src/prisma/src/abstract/base.entity';
import { RoomType } from '../../room-type/entities/room-type.entity';

export enum RoomStatus {
  AVAILABLE = 'AVAILABLE',
  OCCUPIED = 'OCCUPIED',
  RESERVED = 'RESERVED',
  CLEANING = 'CLEANING',
}

export type RoomStatusAcceptedValues =
  | 'AVAILABLE'
  | 'OCCUPIED'
  | 'RESERVED'
  | 'CLEANING';

export class Room extends BaseEntity {
  @ApiProperty({
    description: 'ID del tipo de habitación asociado',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  roomTypeId: string;

  @ApiProperty({
    description: 'Número de la habitación',
    example: 101,
  })
  number: number;

  @ApiProperty({
    description: 'Indica si la habitación tiene papelera',
    example: true,
    default: true,
  })
  trashBin: boolean;

  @ApiProperty({
    description: 'Indica si la habitación tiene toalla',
    example: true,
    default: true,
  })
  towel: boolean;

  @ApiProperty({
    description: 'Indica si la habitación tiene papel higiénico',
    example: true,
    default: true,
  })
  toiletPaper: boolean;

  @ApiProperty({
    description: 'Indica si la habitación tiene jabón de ducha',
    example: true,
    default: true,
  })
  showerSoap: boolean;

  @ApiProperty({
    description: 'Indica si la habitación tiene jabón de manos',
    example: true,
    default: true,
  })
  handSoap: boolean;

  @ApiProperty({
    description: 'Indica si la habitación tiene lámpara',
    example: true,
    default: true,
  })
  lamp: boolean;

  @ApiProperty({
    description: 'Estado de la habitación',
    enum: RoomStatus,
    example: RoomStatus.AVAILABLE,
  })
  status: RoomStatusPrisma;

  constructor(partial: Partial<Room> = {}) {
    super(partial);
    Object.assign(this, partial);
  }
}

export class DetailedRoom extends Room {
  @ApiProperty({
    description: 'Nombre del tipo de habitación asociado',
    type: RoomType,
  })
  RoomTypes: RoomType;
}
