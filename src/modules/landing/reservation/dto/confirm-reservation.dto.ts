// export type ConfirmBookingDtoForSchema = {
//   customer: CustomerDto;
//   reservation: ReservationUpdateDtoForSchema;
//   // payment: PaymentData;
//   observations?: string;
//   didAcceptExtraServices?: boolean;
//   didAcceptTermsAndConditions?: boolean;
// };

import { CustomerDocumentType } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEmail,
  IsPhoneNumber,
  IsEnum,
  IsNotEmpty,
  IsDate,
  IsInt,
  IsUUID,
  IsOptional,
  Min,
  IsBoolean,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

// export type ReservationUpdateDtoForSchema = {
//   checkInDate: Date;
//   checkOutDate: Date;
//   guestNumber: number;
//   roomId: string;
// };

// export type CustomerDto = {
//   name: string;
//   lastname: string;
//   email: string;
//   phone: string;
//   documentType: CustomerDocumentType;
//   documentNumber: string;
// };

export class CustomerDto {
  @ApiProperty({
    description: 'Nombre del cliente',
    example: 'Juan',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Apellido del cliente',
    example: 'Pérez',
  })
  @IsString()
  @IsNotEmpty()
  lastname: string;

  @ApiProperty({
    description: 'Correo electrónico del cliente',
    example: 'cliente@example.com',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'Número de teléfono del cliente',
    example: '+34600123456',
  })
  @IsPhoneNumber()
  phone: string;

  @ApiProperty({
    description: 'Tipo de documento del cliente',
    enum: CustomerDocumentType,
    example: CustomerDocumentType.DNI,
  })
  @IsEnum(CustomerDocumentType)
  documentType: CustomerDocumentType;

  @ApiProperty({
    description: 'Número de documento del cliente',
    example: '12345678X',
  })
  @IsString()
  @IsNotEmpty()
  documentNumber: string;
}

export class UpdateReservationDto {
  @ApiProperty({
    description: 'Fecha de entrada',
    example: '2025-06-01',
  })
  @IsDate()
  @Type(() => Date)
  checkInDate: Date;

  @ApiProperty({
    description: 'Fecha de salida',
    example: '2025-06-05',
  })
  @IsDate()
  @Type(() => Date)
  checkOutDate: Date;

  @ApiProperty({
    description: 'Número de huéspedes',
    example: 2,
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  guestNumber: number;

  @ApiProperty({
    description: 'ID de la habitación',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  roomId: string;
}

export class ConfirmBookingDto {
  @ApiProperty({
    description: 'Datos del cliente',
  })
  @ValidateNested()
  @Type(() => CustomerDto)
  customer: CustomerDto;

  @ApiProperty({
    description: 'Datos de la reserva',
  })
  @ValidateNested()
  @Type(() => UpdateReservationDto)
  reservation: UpdateReservationDto;

  @ApiPropertyOptional({
    description: 'Observaciones para la reserva',
    example: 'Prefiero una habitación con vistas al mar',
  })
  @IsOptional()
  @IsString()
  observations?: string;

  @ApiPropertyOptional({
    description: 'Indica si se han aceptado los servicios extra',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  didAcceptExtraServices?: boolean;

  @ApiPropertyOptional({
    description: 'Indica si se han aceptado los términos y condiciones',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  didAcceptTermsAndConditions?: boolean;
}
