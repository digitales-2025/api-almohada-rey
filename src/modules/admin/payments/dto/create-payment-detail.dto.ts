import { ApiProperty } from '@nestjs/swagger';
import { PaymentDetailMethod, PaymentDetailType } from '@prisma/client';
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

// DTO para la creacion de un Payment Detail
export class CreatePaymentDetailDto {
  @ApiProperty({
    name: 'paymentDate',
    description: 'Date of the payment',
    example: '2021-09-21',
  })
  @IsDateString()
  @IsNotEmpty()
  paymentDate: string;

  @ApiProperty({
    name: 'description',
    description: 'Descripción del detalle de pago',
    example: 'Descripción del detalle de pago',
  })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({
    name: 'type',
    description:
      'Tipo de  detalle de pago. Puede ser ROOM_RESERVATION o EXTRA_SERVICE',
    example: 'ROOM_RESERVATION',
  })
  @IsString()
  @IsNotEmpty()
  @IsIn(['ROOM_RESERVATION', 'EXTRA_SERVICE'], {
    message: "type must be either 'ROOM_RESERVATION' or 'EXTRA_SERVICE'",
  })
  @Transform(({ value }) => value.toUpperCase())
  type: PaymentDetailType;

  @ApiProperty({
    name: 'method',
    description:
      'Método de pago utilizado. Puede ser CASH, CREDIT_CARD, DEBIT_CARD, TRANSFER, YAPE, PLIN, PAYPAL o IZI_PAY',
    example: 'CREDIT_CARD',
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
    ],
    {
      message:
        "method must be one of: 'CASH', 'CREDIT_CARD', 'DEBIT_CARD', 'TRANSFER', 'YAPE', 'PLIN', 'PAYPAL', 'IZI_PAY'",
    },
  )
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
  })
  @IsNumber()
  @IsNotEmpty()
  unitPrice: number;

  @ApiProperty({
    name: 'subtotal',
    description: 'Precio total',
    example: '100.00',
  })
  @IsNumber()
  @IsNotEmpty()
  subtotal: number;
}
