import { ApiProperty, PartialType } from '@nestjs/swagger';
import { CreatePaymentDto } from './create-payment.dto';
import { IsOptional, IsString } from 'class-validator';

export class UpdatePaymentDto extends PartialType(CreatePaymentDto) {
  @ApiProperty({
    name: 'observations',
    description: 'Observaciones',
    example: 'Observaciones',
    required: false,
  })
  @IsString()
  @IsOptional()
  observations?: string;
}
