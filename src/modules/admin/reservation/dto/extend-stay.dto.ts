import {
  IsDateString,
  IsIn,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { PaymentDetailMethod } from '@prisma/client';

/**
 * DTO para extender la estadía de una reserva
 */
export class ExtendStayDto {
  @ApiProperty({
    description: 'Nueva fecha de checkout en formato ISO 8601',
    example: '2025-05-25T12:00:00.000Z',
  })
  @IsNotEmpty({ message: 'La nueva fecha de checkout es obligatoria' })
  @IsString({ message: 'La fecha de checkout debe ser un string' })
  @IsISO8601(
    { strict: true },
    { message: 'La fecha debe estar en formato ISO 8601 válido' },
  )
  newCheckoutDate: string;

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
}
