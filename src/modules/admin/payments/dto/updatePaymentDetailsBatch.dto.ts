import { ApiProperty } from '@nestjs/swagger';
import { PaymentDetailMethod } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class UpdatePaymentDetailsBatchDto {
  @ApiProperty({
    name: 'paymentDetailIds',
    description: 'List of payment detail IDs to update',
    example: [
      '123e4567-e89b-12d3-a456-426614174000',
      '123e4567-e89b-12d3-a456-426614174001',
    ],
    required: true,
  })
  @IsArray()
  @IsUUID(undefined, { each: true })
  @IsNotEmpty()
  paymentDetailIds: string[];

  @ApiProperty({
    name: 'paymentDate',
    description: 'Payment date to apply to all details',
    example: '2025-04-17',
    required: false,
  })
  @IsDateString()
  @IsOptional()
  paymentDate?: string;

  @ApiProperty({
    name: 'method',
    description:
      'Payment method to apply to all details. Can be CASH, CREDIT_CARD, DEBIT_CARD, TRANSFER, YAPE, PLIN, PAYPAL, IZI_PAY or PENDING_PAYMENT',
    example: 'CREDIT_CARD',
    required: false,
  })
  @IsString()
  @IsIn(
    [
      'CASH',
      'CREDIT_CARD',
      'DEBIT_CARD',
      'TRANSFER',
      'YAPE',
      'PLIN',
      'PAYPAL',
      'IZI_PAY',
      'PENDING_PAYMENT',
    ],
    {
      message:
        "method must be one of: 'CASH', 'CREDIT_CARD', 'DEBIT_CARD', 'TRANSFER', 'YAPE', 'PLIN', 'PAYPAL', 'IZI_PAY' or 'PENDING_PAYMENT'",
    },
  )
  @IsOptional()
  @Transform(({ value }) => value.toUpperCase())
  method?: PaymentDetailMethod;
}
