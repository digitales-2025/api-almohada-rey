import { ApiProperty } from '@nestjs/swagger';

export class RucCacheStatsDto {
  @ApiProperty({
    description: 'Total de registros en el caché',
    example: 150,
  })
  total: number;

  @ApiProperty({
    description: 'Fecha del registro más antiguo',
    example: '2024-01-01T00:00:00Z',
    required: false,
  })
  oldestRecord?: Date;

  @ApiProperty({
    description: 'Fecha del registro más reciente',
    example: '2024-12-31T23:59:59Z',
    required: false,
  })
  newestRecord?: Date;
}

export class ClearCacheResponseDto {
  @ApiProperty({
    description: 'Mensaje de confirmación',
    example: 'Caché de RUC limpiado exitosamente',
  })
  message: string;

  @ApiProperty({
    description: 'Número de registros eliminados',
    example: 150,
  })
  deletedCount: number;
}

export class RemoveCacheResponseDto {
  @ApiProperty({
    description: 'Mensaje de confirmación',
    example: 'DNI removed from cache',
  })
  message: string;

  @ApiProperty({
    description: 'Indica si el registro fue eliminado',
    example: true,
  })
  removed: boolean;
}
