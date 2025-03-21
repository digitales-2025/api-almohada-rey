import { ApiProperty } from '@nestjs/swagger';
import { CreateRoomDto } from './create-rooms.dto';

export class CreateRoomWithImagesDto extends CreateRoomDto {
  @ApiProperty({
    type: 'array',
    items: {
      type: 'string',
      format: 'binary',
    },
    description: 'Imágenes de la habitación (opcional)',
  })
  images: any[];
}
