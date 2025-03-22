import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsString } from 'class-validator';

export class DeleteRoomTypeDto {
  @ApiProperty({
    description: 'IDs de los tipos de habitaciones a eliminar',
    type: [String],
    example: ['123e4567-e89b-12d3-a456-426614174000'],
  })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty()
  ids: string[];
}
