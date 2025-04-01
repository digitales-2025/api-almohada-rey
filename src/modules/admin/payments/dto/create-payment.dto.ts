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
        quantity: 0,
        partial: 0,
        percentage: 0,
        finishesWorkItemBudgetId: 'id de la partida',
      },
    ],
  })
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => CreatePaymentDetailDto)
  paymentDetail: CreatePaymentDetailDto[];
}
