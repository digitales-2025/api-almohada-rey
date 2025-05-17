import { IsNotEmpty, IsString, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO para aplicar un late checkout a una reserva
 */
export class LateCheckoutDto {
  @ApiProperty({
    description: 'Nueva hora de checkout (formato HH:mm)',
    example: '14:30',
  })
  @IsNotEmpty({ message: 'La hora de checkout es obligatoria' })
  @IsString({ message: 'La hora de checkout debe ser un string' })
  @Matches(/^([01]?[0-9]|2[0-3]):([0-5][0-9])$/, {
    message: 'El formato de la hora debe ser HH:mm (ejemplo: 14:30)',
  })
  newCheckoutTime: string;
}
