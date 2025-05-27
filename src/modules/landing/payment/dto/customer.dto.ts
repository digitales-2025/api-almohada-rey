import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

export class CustomerDto {
  @ApiProperty({ example: 'cliente@ejemplo.com' })
  @IsEmail()
  email: string;
}
