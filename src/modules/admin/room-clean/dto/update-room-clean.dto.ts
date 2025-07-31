import { ApiProperty, PartialType } from '@nestjs/swagger';
import { CreateCleaningChecklistDto } from './create-room-clean.dto';
import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class UpdateCleaningChecklistDto extends PartialType(
  CreateCleaningChecklistDto,
) {
  @ApiProperty({
    description: 'Fecha de la limpieza',
    example: '2025-03-24',
    required: false,
  })
  @IsDateString()
  @IsNotEmpty()
  @IsOptional()
  date?: string;

  @ApiProperty({
    description: 'Nombre del personal de limpieza',
    example: 'Ana García',
    required: false,
  })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  staffName: string;

  @ApiProperty({
    description: 'Observaciones o comentarios',
    example: 'Se reemplazó jabón y toallas',
    required: false,
  })
  @IsString()
  @IsOptional()
  observations?: string;
}
