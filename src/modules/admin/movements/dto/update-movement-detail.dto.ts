import { ApiProperty, PartialType } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { CreateMovementDetailDto } from './create-movement-detail.dto';

export class UpdateMovementDetailDto extends PartialType(
  CreateMovementDetailDto,
) {
  @ApiProperty({
    name: 'quantity',
    description: 'Quantity of the product',
    example: 0,
    required: false,
  })
  @IsNotEmpty()
  @IsNumber()
  @IsOptional()
  quantity?: number;

  @ApiProperty({
    name: 'unitCost',
    description: 'Unit cost of the product',
    example: 0,
    required: false,
  })
  @IsNotEmpty()
  @IsNumber()
  @IsOptional()
  unitCost?: number;

  @ApiProperty({
    name: 'productId',
    description: 'Id of the product',
    example: 'id del producto',
    required: false,
  })
  @IsNotEmpty()
  @IsUUID()
  @IsString()
  @IsOptional()
  productId?: string;
}
