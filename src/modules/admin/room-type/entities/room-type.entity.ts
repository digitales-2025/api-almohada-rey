import { ApiProperty } from '@nestjs/swagger';
import { FloorTypes as FloorTypesPrisma } from '@prisma/client';
import { BaseEntity } from 'src/prisma/src/abstract/base.entity';
import { FloorTypes } from '../dto';
import { RoomTypes } from '@prisma/client';

export class RoomType extends BaseEntity {
  @ApiProperty({
    description: 'Nombre del tipo de habitación',
    example: 'Habitación doble',
  })
  name: string;

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
    description: 'Descripción de la televisión',
    example: 'Smart TV 42 pulgadas',
  })
  tv: string;

  @ApiProperty({
    enum: FloorTypes,
    description: 'Tipo de piso',
    example: FloorTypes.LAMINATING,
  })
  floorType: FloorTypesPrisma;

  @ApiProperty({
    description: 'Descripción del tipo de habitación',
    example: 'Habitación con vista al mar y balcón privado',
  })
  description: string;

  @ApiProperty({
    description: 'Área en metros cuadrados',
    example: 25.5,
  })
  area: number;

  @ApiProperty({
    description: 'Descripción de la cama',
    example: 'Cama matrimonial king size',
  })
  bed: string;

  /*   @ApiProperty({
    description: 'Estado de activación del tipo de habitación',
    example: true,
  })
  isActive: boolean; */

  constructor(partial: Partial<RoomType> = {}) {
    super(partial);
    Object.assign(this, partial);
  }
}

export type SummaryRoomTypeData = Pick<RoomTypes, 'id' | 'name' | 'isActive'>;
