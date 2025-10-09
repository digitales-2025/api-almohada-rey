import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsString } from 'class-validator';

export class DeleteCustomerReservationHistoryDto {
  @ApiProperty({
    name: 'ids',
    description: 'Array de IDs de registros de historial a eliminar',
    example: ['uuid-1', 'uuid-2'],
  })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty()
  ids: string[];
}
