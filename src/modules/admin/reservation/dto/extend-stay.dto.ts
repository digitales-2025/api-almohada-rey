import { IsISO8601, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO para extender la estadía de una reserva
 */
export class ExtendStayDto {
  @ApiProperty({
    description: 'Nueva fecha de checkout en formato ISO 8601',
    example: '2025-05-25T12:00:00.000Z',
  })
  @IsNotEmpty({ message: 'La nueva fecha de checkout es obligatoria' })
  @IsString({ message: 'La fecha de checkout debe ser un string' })
  @IsISO8601(
    { strict: true },
    { message: 'La fecha debe estar en formato ISO 8601 válido' },
  )
  newCheckoutDate: string;
}
