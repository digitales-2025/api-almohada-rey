import { ApiProperty, PartialType } from '@nestjs/swagger';
import { CreateCustomerDto } from './create-customer.dto';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsPhoneNumber,
  IsString,
} from 'class-validator';
import { CustomerDocumentType, CustomerMaritalStatus } from '@prisma/client';

export class UpdateCustomerDto extends PartialType(CreateCustomerDto) {
  @ApiProperty({
    name: 'name',
    description: 'Nombre del cliente',
    required: false,
  })
  @Transform(({ value }) => value.trim().toLowerCase())
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  name?: string;

  @ApiProperty({
    name: 'address',
    description: 'Dirección del cliente',
    required: false,
  })
  @Transform(({ value }) => value.trim())
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  address?: string;

  @ApiProperty({
    name: 'birthPlace',
    description: 'Lugar de nacimiento del cliente',
    required: false,
  })
  @Transform(({ value }) => value.trim())
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  birthPlace?: string;

  @ApiProperty({
    name: 'country',
    description: 'País de residencia del cliente',
    required: false,
  })
  @Transform(({ value }) => value.trim())
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  country?: string;

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
    required: false,
  })
  @IsNotEmpty()
  @IsPhoneNumber(null)
  @Transform(({ value }) => value.trim())
  @IsOptional()
  phone?: string;

  @ApiProperty({
    name: 'occupation',
    description: 'Ocupación del cliente',
    required: false,
  })
  @Transform(({ value }) => value.trim())
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  occupation?: string;

  @ApiProperty({
    name: 'documentType',
    description:
      'Tipo de documento del cliente. Puede ser DNI, PASSPORT o FOREIGNER_CARD',
    example: 'DNI',
    required: false,
  })
  @IsString()
  @IsNotEmpty()
  @IsIn(['DNI', 'PASSPORT', 'FOREIGNER_CARD'], {
    message: "type must be either 'DNI', 'PASSPORT' or 'FOREIGNER_CARD'",
  })
  @IsOptional()
  @Transform(({ value }) => value.toUpperCase())
  documentType?: CustomerDocumentType;

  @ApiProperty({
    name: 'documentNumber',
    description: 'Número de documento del cliente',
    required: false,
  })
  @Transform(({ value }) => value.trim())
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  documentNumber?: string;

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
    required: false,
  })
  @IsString()
  @IsNotEmpty()
  @IsIn(['SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED'], {
    message:
      "maritalStatus must be either 'SINGLE', 'MARRIED', 'DIVORCED' or 'WIDOWED'",
  })
  @Transform(({ value }) => value.toUpperCase())
  @IsOptional()
  maritalStatus?: CustomerMaritalStatus;

  @ApiProperty({
    name: 'companyName',
    description: 'Nombre de la empresa',
    required: false,
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
