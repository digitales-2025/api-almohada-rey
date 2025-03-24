import { ApiProperty } from '@nestjs/swagger';
import { ProductType } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsIn, IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class CreateProductDto {
  @ApiProperty({
    name: 'name',
    description: 'Nombre del producto',
  })
  @Transform(({ value }) => value.trim().toLowerCase())
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    name: 'unitCost',
    description: 'Costo unitario del producto',
  })
  @IsNotEmpty()
  @IsNumber()
  unitCost: number;

  @ApiProperty({
    name: 'type',
    description: 'Tipo de producto. Puede ser COMMERCIAL o INTERNAL_USE',
    example: 'COMMERCIAL',
  })
  @IsString()
  @IsNotEmpty()
  @IsIn(['COMMERCIAL', 'INTERNAL_USE'], {
    message: "type must be either 'COMMERCIAL' or 'INTERNAL_USE'",
  })
  @Transform(({ value }) => value.toUpperCase())
  type: ProductType;
}
