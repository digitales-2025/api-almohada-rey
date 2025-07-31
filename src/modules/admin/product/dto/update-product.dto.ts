import { ApiProperty, PartialType } from '@nestjs/swagger';
import { CreateProductDto } from './create-product.dto';
import { Transform } from 'class-transformer';
import {
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { ProductType } from '@prisma/client';

export class UpdateProductDto extends PartialType(CreateProductDto) {
  @ApiProperty({
    name: 'name',
    description: 'Nombre del producto',
    required: false,
  })
  @Transform(({ value }) => value.trim().toLowerCase())
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  name: string;

  @ApiProperty({
    name: 'unitCost',
    description: 'Costo unitario del producto',
    required: false,
  })
  @IsNotEmpty()
  @IsNumber()
  @IsOptional()
  unitCost: number;

  @ApiProperty({
    name: 'type',
    description: 'Tipo de producto. Puede ser COMMERCIAL o INTERNAL_USE',
    example: 'COMMERCIAL',
    required: false,
  })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  @IsIn(['COMMERCIAL', 'INTERNAL_USE'], {
    message: "type must be either 'COMMERCIAL' or 'INTERNAL_USE'",
  })
  @Transform(({ value }) => value.toUpperCase())
  type: ProductType;
}
