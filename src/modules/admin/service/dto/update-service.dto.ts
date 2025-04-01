import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsPositive, IsOptional } from 'class-validator';

export class ServiceUpdateDto {
  @ApiProperty({
    description: 'Nombre del servicio',
    example: 'Desayuno buffet',
    required: false,
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({
    description: 'Descripción detallada del servicio',
    example:
      'Desayuno completo con variedad de alimentos, incluye bebidas calientes y frías',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Precio del servicio en moneda local',
    example: 15.99,
    required: false,
  })
  @IsNumber()
  @IsPositive({ message: 'El precio debe ser mayor que cero' })
  @IsOptional()
  price?: number;
}
