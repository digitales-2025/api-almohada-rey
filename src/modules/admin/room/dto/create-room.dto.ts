import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsInt,
  IsPositive,
  IsEnum,
  IsNumber,
} from 'class-validator';
import { Transform } from 'class-transformer';

export enum FloorTypes {
  LAMINATING = 'LAMINATING',
  CARPETING = 'CARPETING',
}
export class CreateRoomDto {
  @ApiProperty({
    description: 'ID del tipo de habitación',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  roomTypeId: string;

  @ApiProperty({
    description: 'Número de la habitación',
    example: 101,
    required: true,
  })
  @IsInt()
  @IsPositive()
  @IsNotEmpty()
  number: number;

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
    description: 'Área en metros cuadrados',
    example: 25.5,
    required: true,
  })
  @IsNumber()
  @IsPositive()
  @IsNotEmpty()
  area: number;

  @ApiProperty({
    description: 'Tipo de piso',
    enum: FloorTypes,
    example: 'LAMINATING',
    required: true,
  })
  @IsEnum(FloorTypes)
  @IsNotEmpty()
  floorType: FloorTypes;
}
