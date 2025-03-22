import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsInt,
  IsNumber,
  IsEnum,
  IsPositive,
  IsOptional,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { RoomTypes, RoomStatus, FloorTypes } from './create-rooms.dto';

export class UpdateRoomDto {
  @ApiProperty({
    description: 'Número de habitación',
    example: 101,
    required: false,
  })
  @IsInt()
  @IsPositive()
  @IsOptional()
  number?: number;

  @ApiProperty({
    description: 'Capacidad máxima de huéspedes',
    example: 2,
    required: false,
  })
  @IsInt()
  @IsPositive()
  @IsOptional()
  guests?: number;

  @ApiProperty({
    description: 'Tipo de habitación',
    enum: RoomTypes,
    example: 'DOUBLE_SINGLE',
    required: false,
  })
  @IsEnum(RoomTypes)
  @IsOptional()
  type?: RoomTypes;

  @ApiProperty({
    description: 'Precio por noche',
    example: 150.5,
    required: false,
  })
  @IsNumber()
  @IsPositive()
  @IsOptional()
  price?: number;

  @ApiProperty({
    description: 'Estado de la habitación',
    enum: RoomStatus,
    example: 'AVAILABLE',
    required: false,
  })
  @IsEnum(RoomStatus)
  @IsOptional()
  status?: RoomStatus;

  @ApiProperty({
    description: 'Descripción de la televisión',
    example: 'Smart TV 42 pulgadas',
    required: false,
  })
  @IsString()
  @IsOptional()
  @Transform(({ value }) => value?.trim())
  tv?: string;

  @ApiProperty({
    description: 'Tipo de piso',
    enum: FloorTypes,
    example: 'LIMINATING',
    required: false,
  })
  @IsEnum(FloorTypes)
  @IsOptional()
  floorType?: FloorTypes;

  @ApiProperty({
    description: 'Descripción de la habitación',
    example: 'Habitación con vista al mar y balcón privado',
    required: false,
  })
  @IsString()
  @IsOptional()
  @Transform(({ value }) => value?.trim())
  description?: string;

  @ApiProperty({
    description: 'Área en metros cuadrados',
    example: 25.5,
    required: false,
  })
  @IsNumber()
  @IsPositive()
  @IsOptional()
  area?: number;

  @ApiProperty({
    description: 'Descripción de la cama',
    example: 'cama 2 plasas',
    required: false,
  })
  @IsString()
  @IsOptional()
  @Transform(({ value }) => value?.trim())
  bed?: string;
}
