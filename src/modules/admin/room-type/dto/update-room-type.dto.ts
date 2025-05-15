import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsInt,
  IsNumber,
  IsPositive,
  IsOptional,
  IsNotEmpty,
} from 'class-validator';
import { Transform } from 'class-transformer';

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
    description: 'Nombre del tipo de habitación en inglés',
    example: 'Double Room',
    required: false,
  })
  @IsString()
  @IsOptional()
  @Transform(({ value }) => value?.trim().toLowerCase())
  nameEn?: string;

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
    description: 'Descripción del tipo de habitación',
    example: 'Habitación con balcón privado',
    required: false,
  })
  @IsString()
  @IsOptional()
  @Transform(({ value }) => value?.trim())
  description?: string;

  @ApiProperty({
    description: 'Descripción del tipo de habitación en inglés',
    example: 'Room with private balcony',
    required: false,
  })
  @IsString()
  @IsOptional()
  @Transform(({ value }) => value?.trim())
  descriptionEn?: string;

  @ApiProperty({
    description: 'Descripción de la cama',
    example: 'Cama matrimonial king size',
    required: false,
  })
  @IsString()
  @IsOptional()
  @Transform(({ value }) => value?.trim())
  bed?: string;

  @ApiProperty({
    description: 'Descripción de la cama en inglés',
    example: 'King size bed',
    required: false,
  })
  @IsString()
  @IsOptional()
  @Transform(({ value }) => value?.trim())
  bedEn?: string;
}
