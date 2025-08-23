import { Controller, Get, Param, Delete } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiBadRequestResponse,
  ApiParam,
} from '@nestjs/swagger';
import { RucService } from './ruc.service';
import { ResponseApiRuc } from 'src/interfaces/ruc.interface';
import { RucResponseDto } from './dto/ruc-response.dto';
import {
  RucCacheStatsDto,
  ClearCacheResponseDto,
} from './dto/ruc-cache-stats.dto';

@ApiTags('RUC')
@Controller('ruc')
export class RucController {
  constructor(private readonly rucService: RucService) {}

  @Get(':ruc')
  @ApiOperation({
    summary: 'Obtener datos de RUC desde SUNAT',
    description:
      'Consulta datos de RUC por scraping de SUNAT y representantes legales desde API Perú. Los datos se almacenan en caché para consultas futuras.',
  })
  @ApiParam({
    name: 'ruc',
    description: 'Número de RUC (11 dígitos)',
    example: '20123456789',
  })
  @ApiOkResponse({
    description: 'Datos del RUC obtenidos exitosamente',
    type: RucResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'RUC inválido o error en la consulta',
  })
  async getDataByRuc(@Param('ruc') ruc: string): Promise<ResponseApiRuc> {
    return this.rucService.getDataByRuc(ruc);
  }

  @Get('cache/stats')
  @ApiOperation({
    summary: 'Obtener estadísticas del caché de RUC',
    description:
      'Retorna estadísticas sobre el uso del caché de consultas RUC.',
  })
  @ApiOkResponse({
    description: 'Estadísticas del caché obtenidas exitosamente',
    type: RucCacheStatsDto,
  })
  async getRucCacheStats() {
    return this.rucService.getRucCacheStats();
  }

  @Delete('cache/clear')
  @ApiOperation({
    summary: 'Limpiar caché de RUC',
    description: 'Elimina todos los registros del caché de consultas RUC.',
  })
  @ApiOkResponse({
    description: 'Caché limpiado exitosamente',
    type: ClearCacheResponseDto,
  })
  async clearRucCache() {
    const deletedCount = await this.rucService.clearRucCache();
    return {
      message: 'Caché de RUC limpiado exitosamente',
      deletedCount,
    };
  }
}
