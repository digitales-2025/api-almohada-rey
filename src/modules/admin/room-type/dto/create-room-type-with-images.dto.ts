import { ApiProperty } from '@nestjs/swagger';
import { CreateRoomTypeDto } from './create-room-type.dto';
import { IsArray } from 'class-validator';

export class CreateRoomTypeWithImagesDto extends CreateRoomTypeDto {
  @ApiProperty({
    type: 'array',
    items: {
      type: 'string',
      format: 'binary',
    },
    description: 'Imágenes del tipo de habitación (exactamente 5 requeridas)',
    required: true,
  })
  @IsArray()
  images: File[];
}
