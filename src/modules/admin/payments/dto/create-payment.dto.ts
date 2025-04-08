import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayNotEmpty,
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { CreatePaymentDetailDto } from './create-payment-detail.dto';
import { Type } from 'class-transformer';

// DTO para la creacion de un Payment
export class CreatePaymentDto {
  @ApiProperty({
    name: 'amount',
    description: 'Monto',
    example: '37829.85',
  })
  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @ApiProperty({
    name: 'amountPaid',
    description: 'Monto pagado',
    example: '38002.55',
    required: false,
  })
  @IsNumber()
  @IsNotEmpty()
  @IsOptional()
  amountPaid?: number;

  @ApiProperty({
    name: 'reservationId',
    description: 'ID de la reserva',
    example: 'ID de la reserva',
  })
  @IsString()
  @IsUUID()
  @IsNotEmpty()
  reservationId: string;

  @ApiProperty({
    name: 'observations',
    description: 'Observaciones',
    example: 'Observaciones',
    required: false,
  })
  @IsString()
  @IsOptional()
  observations?: string;

  @ApiProperty({
    name: 'paymentDetail',
    description: 'Array of details of the payment',
    required: false,
    example: [
      {
        paymentDate: '2023-08-15',
        description: 'Pago de reserva de habitación',
        type: 'ROOM_RESERVATION',
        method: 'CREDIT_CARD',
        roomId: '7a1b9c2d-3e4f-5a6b-7c8d-9e0f1a2b3c4d',
        days: 3,
        unitPrice: 150.0,
        subtotal: 450.0,
      },
      {
        paymentDate: '2023-08-15',
        description: 'Servicio de desayuno',
        type: 'EXTRA_SERVICE',
        method: 'CASH',
        serviceId: '123e4567-e89b-12d3-a456-426614174000',
        quantity: 2,
        unitPrice: 25.0,
        subtotal: 50.0,
      },
    ],
  })
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => CreatePaymentDetailDto)
  paymentDetail: CreatePaymentDetailDto[];
}
