import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsInt,
  IsPositive,
  IsOptional,
  IsBoolean,
  IsEnum,
  IsNumber,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { FloorTypes } from './create-room.dto';
export class UpdateRoomDto {
  @ApiProperty({
    description: 'ID del tipo de habitación',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  @IsString()
  @IsOptional()
  roomTypeId?: string;

  @ApiProperty({
    description: 'Número de la habitación',
    example: 101,
    required: false,
  })
  @IsInt()
  @IsPositive()
  @IsOptional()
  number?: number;

  @ApiProperty({
    description: 'Estado del tacho de basura',
    example: true,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  trashBin?: boolean;

  @ApiProperty({
    description: 'Estado de la toalla',
    example: true,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  towel?: boolean;

  @ApiProperty({
    description: 'Estado del papel higiénico',
    example: true,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  toiletPaper?: boolean;

  @ApiProperty({
    description: 'Estado del jabón de ducha',
    example: true,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  showerSoap?: boolean;

  @ApiProperty({
    description: 'Estado del jabón de manos',
    example: true,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  handSoap?: boolean;

  @ApiProperty({
    description: 'Estado de la lámpara',
    example: true,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  lamp?: boolean;

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
    description: 'Área en metros cuadrados',
    example: 25.5,
    required: false,
  })
  @IsNumber()
  @IsPositive()
  @IsOptional()
  area?: number;

  @ApiProperty({
    description: 'Tipo de piso',
    enum: FloorTypes,
    example: 'LAMINATING',
    required: false,
  })
  @IsEnum(FloorTypes)
  @IsOptional()
  floorType?: FloorTypes;
}
