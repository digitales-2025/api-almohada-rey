import { ApiProperty } from '@nestjs/swagger';
import { CustomerDocumentType, CustomerMaritalStatus } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsPhoneNumber,
  IsString,
} from 'class-validator';

export class CreateCustomerDto {
  @ApiProperty({
    name: 'name',
    description: 'Nombre del cliente',
  })
  @Transform(({ value }) => value.trim().toLowerCase())
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    name: 'address',
    description: 'Dirección del cliente',
  })
  @Transform(({ value }) => value.trim())
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiProperty({
    name: 'birthPlace',
    description: 'Lugar de nacimiento del cliente',
  })
  @Transform(({ value }) => value.trim())
  @IsString()
  @IsNotEmpty()
  birthPlace: string;

  @ApiProperty({
    name: 'birthDate',
    description: 'Date of birth of the customer',
    example: '2021-12-31',
    required: false,
  })
  @IsDateString()
  @IsNotEmpty()
  @IsOptional()
  birthDate?: string;

  @ApiProperty({
    name: 'country',
    description: 'País de residencia del cliente',
  })
  @Transform(({ value }) => value.trim())
  @IsString()
  @IsNotEmpty()
  country: string;

  @ApiProperty({
    name: 'department',
    description: 'Departamento de residencia del cliente',
    required: false,
  })
  @Transform(({ value }) => value.trim())
  @IsString()
  @IsOptional()
  department?: string;

  @ApiProperty({
    name: 'province',
    description: 'Provincia de residencia del cliente',
    required: false,
  })
  @Transform(({ value }) => value.trim())
  @IsString()
  @IsOptional()
  province?: string;

  @ApiProperty({
    name: 'phone',
    description: 'Teléfono del cliente',
  })
  @IsNotEmpty()
  @IsPhoneNumber(null)
  @Transform(({ value }) => value.trim())
  phone: string;

  @ApiProperty({
    name: 'occupation',
    description: 'Ocupación del cliente',
  })
  @Transform(({ value }) => value.trim())
  @IsString()
  @IsNotEmpty()
  occupation: string;

  @ApiProperty({
    name: 'documentType',
    description:
      'Tipo de documento del cliente. Puede ser DNI, PASSPORT o FOREIGNER_CARD',
    example: 'DNI',
  })
  @IsString()
  @IsNotEmpty()
  @IsIn(['DNI', 'PASSPORT', 'FOREIGNER_CARD'], {
    message: "type must be either 'DNI', 'PASSPORT' or 'FOREIGNER_CARD'",
  })
  @Transform(({ value }) => value.toUpperCase())
  documentType: CustomerDocumentType;

  @ApiProperty({
    name: 'documentNumber',
    description: 'Número de documento del cliente',
  })
  @Transform(({ value }) => value.trim())
  @IsString()
  @IsNotEmpty()
  documentNumber: string;

  @ApiProperty({
    name: 'email',
    description: 'Correo electrónico del cliente',
    required: false,
  })
  @Transform(({ value }) => value.trim().toLowerCase())
  @IsEmail()
  @IsNotEmpty()
  @IsOptional()
  email?: string;

  @ApiProperty({
    name: 'maritalStatus',
    description:
      'Estado civil del cliente, puede ser SINGLE, MARRIED, DIVORCED o WIDOWED',
  })
  @IsString()
  @IsNotEmpty()
  @IsIn(['SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED'], {
    message:
      "maritalStatus must be either 'SINGLE', 'MARRIED', 'DIVORCED' or 'WIDOWED'",
  })
  @Transform(({ value }) => value.toUpperCase())
  maritalStatus: CustomerMaritalStatus;

  @ApiProperty({
    name: 'companyName',
    description: 'Nombre de la empresa',
  })
  @Transform(({ value }) => value.trim())
  @IsString()
  @IsOptional()
  companyName?: string;

  @ApiProperty({
    name: 'ruc',
    description: 'RUC de la empresa',
    required: false,
  })
  @Transform(({ value }) => value.trim())
  @IsString()
  @IsOptional()
  ruc?: string;

  @ApiProperty({
    name: 'companyAddress',
    description: 'Dirección de la empresa',
    required: false,
  })
  @Transform(({ value }) => value.trim())
  @IsString()
  @IsOptional()
  companyAddress?: string;
}
