import { ApiProperty, PartialType } from '@nestjs/swagger';
import { CreateCustomerReservationHistoryDto } from './create-customer-reservation-history.dto';
import { IsDateString, IsNotEmpty, IsOptional } from 'class-validator';

export class UpdateCustomerReservationHistoryDto extends PartialType(
  CreateCustomerReservationHistoryDto,
) {
  @ApiProperty({
    name: 'date',
    description: 'Fecha de la reserva anterior',
    example: '2023-12-25',
    required: false,
  })
  @IsDateString()
  @IsNotEmpty()
  @IsOptional()
  date: string;
}
