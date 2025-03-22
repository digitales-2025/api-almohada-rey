import { ApiProperty } from '@nestjs/swagger';
import { UpdateRoomDto } from './update-room-type.dto';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

// DTO para operaciones con una imagen existente
export class ImageUpdateDto {
  @ApiProperty({
    description: 'ID de la imagen a actualizar',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  @IsOptional() // Opcional para permitir actualizaciones parciales
  imageId?: string;

  @ApiProperty({
    description: 'URL actual de la imagen',
    example: 'https://pub-c8a9c1f826c540b981f5cfb49c3a55ea.r2.dev/image.jpg',
  })
  @IsString()
  @IsOptional()
  url?: string;

  @ApiProperty({
    description: 'Indica si esta imagen es la principal',
    example: false,
  })
  @IsBoolean()
  @IsOptional()
  isMain?: boolean;
}

export class UpdateRoomWithImagesDto extends UpdateRoomDto {
  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'Nueva imagen para agregar o reemplazar',
    required: false,
  })
  @IsOptional()
  newImage?: File; // Representación de un archivo único

  @ApiProperty({
    type: ImageUpdateDto,
    description: 'Información para actualizar una imagen existente',
    required: false,
    example: {
      imageId: '123e4567-e89b-12d3-a456-426614174000',
      url: 'https://pub-c8a9c1f826c540b981f5cfb49c3a55ea.r2.dev/image.jpg',
      isMain: true,
    },
  })
  @IsOptional()
  imageUpdate?: ImageUpdateDto;
}
