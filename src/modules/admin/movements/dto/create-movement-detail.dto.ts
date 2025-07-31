import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString, IsUUID } from 'class-validator';

export class CreateMovementDetailDto {
  @ApiProperty({
    name: 'quantity',
    description: 'Quantity of the product',
    example: 0,
  })
  @IsNotEmpty()
  @IsNumber()
  quantity: number;

  @ApiProperty({
    name: 'unitCost',
    description: 'Unit cost of the product',
    example: 0,
  })
  @IsNotEmpty()
  @IsNumber()
  unitCost: number;

  @ApiProperty({
    name: 'productId',
    description: 'Id of the product',
    example: 'id del producto',
  })
  @IsNotEmpty()
  @IsUUID()
  @IsString()
  productId: string;
}
