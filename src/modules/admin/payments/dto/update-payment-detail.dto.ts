import { ApiProperty, PartialType } from '@nestjs/swagger';
import { PaymentDetailMethod } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { CreatePaymentDetailDto } from './create-payment-detail.dto';

// DTO para la creacion de un Payment Detail
export class UpdatePaymentDetailDto extends PartialType(
  CreatePaymentDetailDto,
) {
  @ApiProperty({
    name: 'paymentDate',
    description: 'Date of the payment',
    example: '2021-09-21',
    required: false,
  })
  @IsDateString()
  @IsNotEmpty()
  @IsOptional()
  paymentDate: string;

  @ApiProperty({
    name: 'description',
    description: 'Descripción del detalle de pago',
    example: 'Descripción del detalle de pago',
    required: false,
  })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  description: string;

  @ApiProperty({
    name: 'method',
    description:
      'Método de pago utilizado. Puede ser CASH, CREDIT_CARD, DEBIT_CARD, TRANSFER, YAPE, PLIN, PAYPAL, IZI_PAY o PENDING_PAYMENT',
    example: 'CREDIT_CARD',
    required: false,
  })
  @IsString()
  @IsNotEmpty()
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
  method: PaymentDetailMethod;

  @ApiProperty({
    name: 'productId',
    description: 'ID del producto',
    example: 'ID del producto',
    required: false,
  })
  @IsString()
  @IsUUID()
  @IsOptional()
  productId?: string;

  @ApiProperty({
    name: 'serviceId',
    description: 'ID del servicio',
    example: 'ID del servicio',
    required: false,
  })
  @IsString()
  @IsUUID()
  @IsOptional()
  serviceId?: string;

  @ApiProperty({
    name: 'quantity',
    description: 'Cantidad de productos',
    example: '1',
    required: false,
  })
  @IsNumber()
  @IsNotEmpty()
  @IsOptional()
  quantity?: number;

  @ApiProperty({
    name: 'roomId',
    description: 'ID de la habitación',
    example: 'ID de la habitación',
    required: false,
  })
  @IsString()
  @IsUUID()
  @IsOptional()
  roomId?: string;

  @ApiProperty({
    name: 'days',
    description: 'Cantidad de días',
    example: '1',
    required: false,
  })
  @IsNumber()
  @IsNotEmpty()
  @IsOptional()
  days?: number;

  @ApiProperty({
    name: 'unitPrice',
    description: 'Precio unitario',
    example: '100.00',
    required: false,
  })
  @IsNumber()
  @IsNotEmpty()
  @IsOptional()
  unitPrice: number;

  @ApiProperty({
    name: 'subtotal',
    description: 'Precio total',
    example: '100.00',
    required: false,
  })
  @IsNumber()
  @IsNotEmpty()
  @IsOptional()
  subtotal: number;
}
