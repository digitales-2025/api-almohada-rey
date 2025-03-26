import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsInt,
  IsPositive,
  IsOptional,
  IsBoolean,
} from 'class-validator';

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
}
