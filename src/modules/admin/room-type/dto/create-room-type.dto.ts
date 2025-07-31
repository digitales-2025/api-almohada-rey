import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsInt,
  IsNumber,
  IsPositive,
  IsOptional,
} from 'class-validator';
import { Transform } from 'class-transformer';

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
    description: 'Descripción del tipo de habitación',
    example: 'Habitación con balcón privado',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => value?.trim())
  description: string;

  @ApiProperty({
    description: 'Descripción del tipo de habitación en inglés',
    example: 'Room with private balcony',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => value?.trim())
  descriptionEn: string;

  @ApiProperty({
    description: 'Descripción de la cama',
    example: 'Cama matrimonial king size',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => value?.trim())
  bed: string;

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
