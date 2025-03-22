import { ApiProperty } from '@nestjs/swagger';
import { RoomTypes, FloorTypes, RoomStatus } from '../dto';
import { BaseEntity } from 'src/prisma/src/abstract/base.entity';
import {
  RoomTypes as PrismaRoomTypes,
  RoomStatus as PrismaRoomStatus,
  FloorTypes as PrismaFloorTypes,
} from '@prisma/client';
export class Room extends BaseEntity {
  @ApiProperty({
    description: 'Room number',
    example: 101,
  })
  number: number;

  @ApiProperty({
    description: 'Maximum number of guests',
    example: 2,
  })
  guests: number;

  @ApiProperty({
    enum: RoomTypes,
    description: 'Type of room',
    example: RoomTypes.SINGLE,
  })
  type: PrismaRoomTypes;

  @ApiProperty({
    description: 'Price per night',
    example: 99.99,
  })
  price: number;

  @ApiProperty({
    enum: RoomStatus,
    description: 'Current status of the room',
    example: RoomStatus.AVAILABLE,
  })
  status: PrismaRoomStatus;

  @ApiProperty({
    description: 'TV model or details',
    example: 'Samsung 50" Smart TV',
  })
  tv: string;

  @ApiProperty({
    enum: FloorTypes,
    description: 'Type of floor',
    example: FloorTypes.CARPETING,
  })
  floorType: PrismaFloorTypes;

  @ApiProperty({
    description: 'Room description',
    example: 'Spacious room with ocean view',
  })
  description: string;

  @ApiProperty({
    description: 'Room area in square meters',
    example: 25,
  })
  area: number;

  @ApiProperty({
    description: 'Whether the room is active',
    example: true,
  })
  isActive: boolean;

  constructor(partial: Partial<Room> = {}) {
    super(partial);
    Object.assign(this, partial);
  }

  // toJSON(): Record<string, any> {
  //   return {
  //     id: this.id,
  //     number: this.number,
  //     guests: this.guests,
  //     type: this.type,
  //     price: this.price,
  //     status: this.status,
  //     tv: this.tv,
  //     floorType: this.floorType,
  //     description: this.description,
  //     area: this.area,
  //     isActive: this.isActive,
  //     createdAt: this.createdAt,
  //     updatedAt: this.updatedAt,
  //   };
  // }
}
