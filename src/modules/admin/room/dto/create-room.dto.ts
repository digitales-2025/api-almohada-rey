import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsInt, IsPositive } from 'class-validator';

export class CreateRoomDto {
  @ApiProperty({
    description: 'ID del tipo de habitación',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  roomTypeId: string;

  @ApiProperty({
    description: 'Número de la habitación',
    example: 101,
    required: true,
  })
  @IsInt()
  @IsPositive()
  @IsNotEmpty()
  number: number;
}
