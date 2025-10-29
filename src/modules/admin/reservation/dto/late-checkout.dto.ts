import {
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsNumber,
  Matches,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PaymentDetailMethod } from '@prisma/client';
import { Transform } from 'class-transformer';

/**
 * DTO para aplicar un late checkout a una reserva
 */
export class LateCheckoutDto {
  @ApiProperty({
    description: 'Nueva hora de checkout (formato HH:mm)',
    example: '14:30',
  })
  @IsNotEmpty({ message: 'La hora de checkout es obligatoria' })
  @IsString({ message: 'La hora de checkout debe ser un string' })
  @Matches(/^([01]?[0-9]|2[0-3]):([0-5][0-9])$/, {
    message: 'El formato de la hora debe ser HH:mm (ejemplo: 14:30)',
  })
  lateCheckoutTime: string;

  @ApiProperty({
    description: 'Notas adicionales sobre el late checkout',
    example: 'Cliente solicitó una extensión de tiempo por motivos personales',
    required: false,
  })
  @IsString({ message: 'Las notas adicionales deben ser un string' })
  @IsOptional({ message: 'Las notas adicionales son opcionales' })
  additionalNotes?: string;

  @ApiProperty({
    name: 'paymentDate',
    description: 'Date of the payment',
    example: '2021-09-21',
  })
  @IsDateString()
  @IsNotEmpty()
  paymentDate: string;

  @ApiProperty({
    name: 'paymentMethod',
    description:
      'Método de pago utilizado. Puede ser CASH, CREDIT_CARD, DEBIT_CARD, TRANSFER, YAPE, PLIN, PAYPAL, IZI_PAY o PENDING_PAYMENT',
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
      'PENDING_PAYMENT',
    ],
    {
      message:
        "method must be one of: 'CASH', 'CREDIT_CARD', 'DEBIT_CARD', 'TRANSFER', 'YAPE', 'PLIN', 'PAYPAL', 'IZI_PAY', 'PENDING_PAYMENT'",
    },
  )
  @Transform(({ value }) => value.toUpperCase())
  paymentMethod: PaymentDetailMethod;

  @ApiProperty({
    name: 'discount',
    description: 'Descuento aplicado (opcional, solo para habitaciones)',
    example: '5.00',
    required: false,
  })
  @IsNumber()
  @IsOptional()
  discount?: number;
}
