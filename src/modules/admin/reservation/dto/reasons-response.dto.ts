import { ApiProperty } from '@nestjs/swagger';

export class ReasonResponseDto {
  @ApiProperty({
    description: 'Razón de la reserva',
    type: String,
    example: 'negocios',
  })
  reason: string;
}
