import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsUUID,
  IsOptional,
  IsDateString,
} from 'class-validator';

export class CreateCleaningChecklistDto {
  @ApiProperty({
    description: 'Fecha de la limpieza',
    example: '2025-03-24',
    required: true,
  })
  @IsDateString()
  @IsNotEmpty()
  date: string;

  @ApiProperty({
    description: 'ID de la habitación',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: true,
  })
  @IsUUID()
  @IsNotEmpty()
  roomId: string;

  @ApiProperty({
    description: 'Nombre del personal de limpieza',
    example: 'Ana García',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  staffName: string;

  @ApiProperty({
    description: 'ID del usuario verificador',
    example: '123e4567-e89b-12d3-a456-426614174001',
    required: true,
  })
  @IsUUID()
  @IsNotEmpty()
  userCheckId: string;

  @ApiProperty({
    description: 'Observaciones o comentarios',
    example: 'Se reemplazó jabón y toallas',
    required: false,
  })
  @IsString()
  @IsOptional()
  observations?: string;
}
