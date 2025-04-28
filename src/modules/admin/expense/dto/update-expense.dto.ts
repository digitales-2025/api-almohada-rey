import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';
import { CreateHotelExpenseDto } from './create-expense.dto';

export class UpdateHotelExpenseDto extends PartialType(CreateHotelExpenseDto) {
  // Todos los campos de CreateHotelExpenseDto son ahora opcionales
  // gracias a PartialType. No necesitas añadir nada más aquí
  // a menos que tengas campos específicos solo para la actualización.

  @ApiPropertyOptional({
    description: 'Indica si se deben eliminar los datos de documento',
    example: false,
    type: Boolean,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return Boolean(value);
  })
  dataDocument?: boolean;
}
