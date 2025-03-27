import { ApiProperty } from '@nestjs/swagger';
import { BaseEntity } from 'src/prisma/src/abstract/base.entity';

export class CleaningChecklist extends BaseEntity {
  @ApiProperty({
    description: 'Fecha de la limpieza',
    example: '2025-03-24',
  })
  date: string;

  @ApiProperty({
    description: 'ID de la habitación',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  roomId: string;

  @ApiProperty({
    description: 'Nombre del personal de limpieza',
    example: 'Ana García',
  })
  staffName: string;

  @ApiProperty({
    description: 'ID del usuario que verifica',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  userCheckId: string;

  @ApiProperty({
    description: 'Observaciones o comentarios',
    example: 'Se reemplazaron las toallas y se repuso el jabón',
    required: false,
    nullable: true,
  })
  observations?: string;

  constructor(partial: Partial<CleaningChecklist> = {}) {
    super(partial);
    Object.assign(this, partial);
  }
}
