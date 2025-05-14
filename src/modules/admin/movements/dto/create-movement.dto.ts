import { ApiProperty } from '@nestjs/swagger';
import { ExpenseDocumentType, TypeMovements } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { CreateMovementDetailDto } from './create-movement-detail.dto';

export class CreateMovementDto {
  @ApiProperty({
    name: 'dateMovement',
    description: 'Date of the movement',
    example: '2021-09-21',
  })
  @IsDateString()
  @IsNotEmpty()
  dateMovement: string;

  @ApiProperty({
    name: 'type',
    description:
      'Type of the movement with document number (either RECEIPT, INVOICE or OTHER)',
    example: 'RECEIPT',
    required: false,
  })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  @IsIn(['INVOICE', 'RECEIPT', 'OTHER'], {
    message: "type must be either 'INVOICE', 'RECEIPT' or 'OTHER'",
  })
  @Transform(({ value }) => value.toUpperCase())
  typePurchaseOrder?: ExpenseDocumentType;

  @ApiProperty({
    name: 'documentNumber',
    description: 'Document number of the movement',
    example: '123456',
    required: false,
  })
  @IsString()
  @IsOptional()
  @IsNotEmpty()
  documentNumber?: string;

  @ApiProperty({
    name: 'type',
    description:
      'Type of movement to set the movement to. Can only be INPUT or OUTPUT',
    example: 'INPUT',
  })
  @IsString()
  @IsNotEmpty()
  @IsIn(['INPUT', 'OUTPUT'], {
    message: "type must be either 'INPUT' or 'OUTPUT'",
  })
  @Transform(({ value }) => value.toUpperCase())
  type: TypeMovements;

  @ApiProperty({
    name: 'description',
    description: 'Description of the movement',
    example: 'Description of the movement',
  })
  @IsString()
  @IsOptional()
  @IsNotEmpty()
  description?: string;

  @ApiProperty({
    name: 'warehouseId',
    description: 'Id of the warehouse',
    example: 'id del almacen',
  })
  @IsString()
  @IsNotEmpty()
  @IsUUID()
  warehouseId: string;

  @ApiProperty({
    name: 'movementDetail',
    description: 'Array of details of the movement',
    required: false,
    example: [
      {
        quantity: 0,
        unitCost: 0,
        productId: 'id del producto',
      },
    ],
  })
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => CreateMovementDetailDto)
  movementDetail: CreateMovementDetailDto[];
}
