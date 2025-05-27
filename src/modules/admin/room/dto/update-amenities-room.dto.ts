import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsBoolean } from 'class-validator';
export class UpdateAmenitiesRoomDto {
  @ApiProperty({
    description: 'Estado del tacho de basura',
    example: true,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  trashBin?: boolean;

  @ApiProperty({
    description: 'Estado de la toalla',
    example: true,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  towel?: boolean;

  @ApiProperty({
    description: 'Estado del papel higiénico',
    example: true,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  toiletPaper?: boolean;

  @ApiProperty({
    description: 'Estado del jabón de ducha',
    example: true,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  showerSoap?: boolean;

  @ApiProperty({
    description: 'Estado del jabón de manos',
    example: true,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  handSoap?: boolean;

  @ApiProperty({
    description: 'Estado de la lámpara',
    example: true,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  lamp?: boolean;
}
