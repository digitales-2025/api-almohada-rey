import { ApiProperty } from '@nestjs/swagger';
import { BaseEntity } from 'src/prisma/src/abstract/base.entity';
import { RoomTypes } from '@prisma/client';

export class RoomType extends BaseEntity {
  @ApiProperty({
    description: 'Nombre del tipo de habitación',
    example: 'Habitación doble',
  })
  name: string;

  @ApiProperty({
    description: 'Nombre del tipo de habitación en inglés',
    example: 'Double Room',
  })
  nameEn?: string;

  @ApiProperty({
    description: 'Capacidad máxima de huéspedes',
    example: 2,
  })
  guests: number;

  @ApiProperty({
    description: 'Precio por noche',
    example: 150.5,
  })
  price: number;

  @ApiProperty({
    description: 'Descripción del tipo de habitación',
    example: 'Habitación con vista al mar y balcón privado',
  })
  description: string;

  @ApiProperty({
    description: 'Descripción del tipo de habitación en inglés',
    example: 'Room with sea view and private balcony',
  })
  descriptionEn: string;

  @ApiProperty({
    description: 'Descripción de la cama',
    example: 'Cama matrimonial king size',
  })
  bed: string;

  @ApiProperty({
    description: 'Descripción de la cama en inglés',
    example: 'King size bed',
  })
  bedEn?: string;

  constructor(partial: Partial<RoomType> = {}) {
    super(partial);
    Object.assign(this, partial);
  }
}

export type SummaryRoomTypeData = Pick<RoomTypes, 'id' | 'name' | 'isActive'>;
