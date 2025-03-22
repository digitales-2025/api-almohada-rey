import { ApiProperty } from '@nestjs/swagger';
import { CreateRoomDto } from './create-room-type.dto';

export class CreateRoomWithImagesDto extends CreateRoomDto {
  @ApiProperty({
    type: 'array',
    items: {
      type: 'string',
      format: 'binary',
    },
    description: 'Imágenes de la habitación (opcional)',
  })
  images: File[];
}
