import { ApiProperty } from '@nestjs/swagger';
import { UpdateRoomDto } from './update-rooms.dto';
import { IsOptional } from 'class-validator';
export class UpdateRoomWithImagesDto extends UpdateRoomDto {
  @ApiProperty({
    type: 'array',
    items: {
      type: 'string',
      format: 'binary',
    },
    description: 'Nuevas imágenes para agregar (opcional)',
    required: false,
  })
  @IsOptional()
  newImages?: any[];

  @ApiProperty({
    type: 'array',
    items: {
      type: 'object',
      properties: {
        imageId: {
          type: 'string',
          example: '123e4567-e89b-12d3-a456-426614174000',
        },
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
    description: 'Imágenes existentes a actualizar (opcional)',
    required: false,
  })
  @IsOptional()
  imageUpdates?: any[];
}
