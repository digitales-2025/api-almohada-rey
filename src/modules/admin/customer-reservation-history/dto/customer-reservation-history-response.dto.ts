import { ApiProperty } from '@nestjs/swagger';

export class CustomerInfoDto {
  @ApiProperty({
    description: 'ID del cliente',
    example: 'uuid-del-cliente',
  })
  id: string;

  @ApiProperty({
    description: 'Nombre del cliente',
    example: 'Juan Pérez',
  })
  name: string;
}

export class CustomerReservationHistoryResponseDto {
  @ApiProperty({
    description: 'ID único del registro de historial',
    example: 'uuid-del-registro',
  })
  id: string;

  @ApiProperty({
    description: 'ID del cliente',
    example: 'uuid-del-cliente',
  })
  customerId: string;

  @ApiProperty({
    description: 'Fecha de la reserva anterior',
    example: '2023-12-25',
  })
  date: string;

  @ApiProperty({
    description: 'Fecha de creación del registro',
    example: '2024-01-15T10:30:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Fecha de última actualización del registro',
    example: '2024-01-15T10:30:00Z',
  })
  updatedAt: Date;

  @ApiProperty({
    description: 'Información del cliente',
    required: false,
    type: CustomerInfoDto,
  })
  customer?: CustomerInfoDto;
}
