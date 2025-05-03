import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsUUID } from 'class-validator';

export class DeleteHotelExpenseDto {
  @ApiProperty({
    description: 'IDs de los gastos a eliminar',
    type: [String],
    format: 'uuid',
    example: [
      '123e4567-e89b-12d3-a456-426614174000',
      '987e6543-e21b-12d3-a456-556614174001',
    ],
  })
  @IsArray()
  @IsUUID('4', { each: true, message: 'Cada ID debe ser un UUID válido.' }) // Valida que cada elemento sea un UUID v4
  @IsNotEmpty({ message: 'La lista de IDs no puede estar vacía.' })
  ids: string[];
}
