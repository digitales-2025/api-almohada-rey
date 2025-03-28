import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsInt,
  IsNumber,
  IsEnum,
  IsPositive,
  IsOptional,
  IsNotEmpty,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { FloorTypes } from './create-room-type.dto';

export class UpdateRoomTypeDto {
  @ApiProperty({
    description: 'Nombre del tipo de habitación',
    example: 'Habitación doble',
    required: false,
  })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  @Transform(({ value }) => value?.trim().toLowerCase())
  name: string;

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
    description: 'Precio por noche',
    example: 150.5,
    required: false,
  })
  @IsNumber()
  @IsPositive()
  @IsOptional()
  price?: number;

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
    example: 'LAMINATING',
    required: false,
  })
  @IsEnum(FloorTypes)
  @IsOptional()
  floorType?: FloorTypes;

  @ApiProperty({
    description: 'Descripción del tipo de habitación',
    example: 'Habitación con balcón privado',
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
    example: 'Cama matrimonial king size',
    required: false,
  })
  @IsString()
  @IsOptional()
  @Transform(({ value }) => value?.trim())
  bed?: string;
}
