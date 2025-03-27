import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty, IsUUID } from 'class-validator';

export class CheckAvailabilityDto {
  @ApiProperty({
    description: 'ID de la habitación a verificar',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  @IsNotEmpty()
  roomId: string;

  @ApiProperty({
    description: 'Fecha de check-in (formato ISO)',
    example: '2025-04-01T14:00:00.000Z',
  })
  @IsDateString()
  @IsNotEmpty()
  checkInDate: string;

  @ApiProperty({
    description: 'Fecha de check-out (formato ISO)',
    example: '2025-04-05T12:00:00.000Z',
  })
  @IsDateString()
  @IsNotEmpty()
  checkOutDate: string;
}

export class RoomAvailabilityDto {
  @ApiProperty({
    description: 'ID de la habitación consultada',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  roomId: string;

  @ApiProperty({
    description: 'Fecha de check-in consultada',
    example: '2025-04-01T14:00:00.000Z',
  })
  checkInDate: string;

  @ApiProperty({
    description: 'Fecha de check-out consultada',
    example: '2025-04-05T12:00:00.000Z',
  })
  checkOutDate: string;

  @ApiProperty({
    description:
      'Indica si la habitación está disponible para las fechas solicitadas',
    example: true,
  })
  isAvailable: boolean;

  @ApiProperty({
    description: 'Nombre de la habitación (si está disponible)',
    example: 'Suite Presidencial',
    required: false,
  })
  roomNumber?: string;

  @ApiProperty({
    description: 'Nombre del tipo de la habitación (si está disponible)',
    example: 'Suite Presidencial',
    required: false,
  })
  roomTypeName?: string;

  @ApiProperty({
    description: 'Precio de la habitación (si está disponible)',
    example: 250.0,
    required: false,
  })
  roomPrice?: number;
}
