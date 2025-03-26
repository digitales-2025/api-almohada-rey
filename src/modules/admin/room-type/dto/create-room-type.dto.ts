import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsInt,
  IsNumber,
  IsEnum,
  IsPositive,
} from 'class-validator';
import { Transform } from 'class-transformer';

export enum FloorTypes {
  LIMINATING = 'LIMINATING',
  CARPETING = 'CARPETING',
}

export class CreateRoomTypeDto {
  @ApiProperty({
    description: 'Nombre del tipo de habitación',
    example: 'Habitación doble',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => value?.trim().toLowerCase())
  name: string;

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
    description: 'Precio por noche',
    example: 150.5,
    required: true,
  })
  @IsNumber()
  @IsPositive()
  @IsNotEmpty()
  price: number;

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
    description: 'Descripción del tipo de habitación',
    example: 'Habitación con balcón privado',
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
    description: 'Descripción de la cama',
    example: 'Cama matrimonial king size',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => value?.trim())
  bed: string;
}
