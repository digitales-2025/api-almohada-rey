import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty, IsString } from 'class-validator';

export class CreateCustomerReservationHistoryDto {
  @ApiProperty({
    name: 'customerId',
    description: 'ID del cliente',
    example: 'uuid-del-cliente',
  })
  @IsString()
  @IsNotEmpty()
  customerId: string;

  @ApiProperty({
    name: 'date',
    description: 'Fecha de la reserva anterior',
    example: '2023-12-25',
  })
  @IsDateString()
  @IsNotEmpty()
  date: string;
}
