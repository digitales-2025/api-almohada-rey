import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsNotEmpty,
  IsBoolean,
  IsInt,
  IsNumber,
  IsEnum,
  Min,
  IsPositive,
} from 'class-validator';
import { Transform } from 'class-transformer';

export enum RoomTypes {
  SINGLE = 'SINGLE',
  DOUBLE_SINGLE = 'DOUBLE_SINGLE',
  DOUBLE_FAMILY = 'DOUBLE_FAMILY',
  SUITE = 'SUITE',
  MATRIMONIAL = 'MATRIMONIAL',
}

export enum RoomStatus {
  AVAILABLE = 'AVAILABLE',
  OCCUPIED = 'OCCUPIED',
  RESERVED = 'RESERVED',
  CLEANING = 'CLEANING',
}

export enum FloorTypes {
  LIMINATING = 'LIMINATING',
  CARPETING = 'CARPETING',
}

export class CreateRoomDto {
  @ApiProperty({
    description: 'Número de habitación',
    example: 101,
    required: true,
  })
  @IsInt()
  @IsPositive()
  @IsNotEmpty()
  number: number;

  @ApiProperty({
    description: 'Capacidad máxima de huéspedes',
    example: 2,
    required: true,
  })
  @IsInt()
  @IsPositive()
  @IsNotEmpty()
  guests: number;

  @ApiProperty({
    description: 'Tipo de habitación',
    enum: RoomTypes,
    example: 'DOUBLE_SINGLE',
    required: true,
  })
  @IsEnum(RoomTypes)
  @IsNotEmpty()
  type: RoomTypes;

  @ApiProperty({
    description: 'Precio por noche',
    example: 150.50,
    required: true,
  })
  @IsNumber()
  @IsPositive()
  @IsNotEmpty()
  price: number;

  @ApiProperty({
    description: 'Estado de la habitación',
    enum: RoomStatus,
    example: 'AVAILABLE',
    required: true,
  })
  @IsEnum(RoomStatus)
  @IsNotEmpty()
  status: RoomStatus;

  @ApiProperty({
    description: 'Descripción de la televisión',
    example: 'Smart TV 42 pulgadas',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => value?.trim())
  tv: string;

  @ApiProperty({
    description: 'Tipo de piso',
    enum: FloorTypes,
    example: 'LIMINATING',
    required: true,
  })
  @IsEnum(FloorTypes)
  @IsNotEmpty()
  floorType: FloorTypes;

  @ApiProperty({
    description: 'Descripción de la habitación',
    example: 'Habitación con vista al mar y balcón privado',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => value?.trim())
  description: string;

  @ApiProperty({
    description: 'Área en metros cuadrados',
    example: 25.5,
    required: true,
  })
  @IsNumber()
  @IsPositive()
  @IsNotEmpty()
  area: number;

  @ApiProperty({
    description: 'Estado activo',
    example: true,
    default: true,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}