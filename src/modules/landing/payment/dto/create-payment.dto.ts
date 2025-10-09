/*
// PAYMENT MODULE - COMMENTED OUT (NO LONGER IN USE)
import { ApiProperty } from '@nestjs/swagger';
import {
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CustomerDto } from './customer.dto';

export class CreatePaymentDto {
  @ApiProperty({ example: 200, description: 'Monto en céntimos (PEN)' })
  @IsNumber()
  amount: number;

  @ApiProperty({ example: 'PEN', description: 'Moneda del pago' })
  @IsString()
  currency: string;

  @ApiProperty({ example: 'pedido-001', description: 'ID de la orden' })
  @IsString()
  orderId: string;

  @ApiProperty({
    description: 'Información del cliente',
    type: CustomerDto,
  })
  @ValidateNested()
  @Type(() => CustomerDto)
  customer: CustomerDto;

  @ApiProperty({
    example: 'https://miweb.com/retorno',
    required: false,
    description: 'URL opcional de retorno luego del pago',
  })
  @IsOptional()
  @IsString()
  returnUrl?: string;
}
*/
