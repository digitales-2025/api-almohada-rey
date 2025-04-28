import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  MaxLength,
  IsDateString,
  IsNumber,
} from 'class-validator';
import { Transform } from 'class-transformer';
import {
  ExpenseCategory,
  ExpensePaymentMethod,
  ExpenseDocumentType,
} from '@prisma/client';

export class CreateHotelExpenseDto {
  @ApiProperty({
    description: 'Descripción del gasto',
    example: 'Compra de suministros de limpieza',
    maxLength: 255,
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  @Transform(({ value }) => value?.trim())
  description: string;

  @ApiProperty({
    description: 'Categoría del gasto',
    enum: ExpenseCategory,
    example: ExpenseCategory.VARIABLE,
    required: true,
  })
  @IsEnum(ExpenseCategory)
  @IsNotEmpty()
  category: ExpenseCategory;

  @ApiProperty({
    description: 'Método de pago utilizado',
    enum: ExpensePaymentMethod,
    example: ExpensePaymentMethod.CASH,
    required: true,
  })
  @IsEnum(ExpensePaymentMethod)
  @IsNotEmpty()
  paymentMethod: ExpensePaymentMethod;

  @ApiProperty({
    name: 'amount',
    description: 'Precio del gasto (en formato numérico)',
    example: '100.15',
  })
  @IsNumber()
  @IsNotEmpty()
  amount: number; // Cambiado a string para mantener precisión exacta

  @ApiProperty({
    description:
      'Fecha del gasto (formato ISO 8601 recomendado, ej: YYYY-MM-DD)',
    example: '2025-04-26',
    required: true,
  })
  @IsDateString()
  @IsNotEmpty()
  date: string;

  @ApiPropertyOptional({
    description: 'Tipo de documento que respalda el gasto (opcional)',
    enum: ExpenseDocumentType,
    example: ExpenseDocumentType.INVOICE,
  })
  @IsOptional()
  @IsEnum(ExpenseDocumentType)
  documentType?: ExpenseDocumentType;

  @ApiPropertyOptional({
    description: 'Número del documento que respalda el gasto (opcional)',
    example: 'F001-001234',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  @Transform(({ value }) => value?.trim())
  documentNumber?: string;
}
