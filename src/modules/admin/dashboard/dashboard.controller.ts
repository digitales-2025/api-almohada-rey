import {
  Controller,
  Get,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import {
  ApiTags,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiUnauthorizedResponse,
  ApiInternalServerErrorResponse,
  ApiBadRequestResponse,
} from '@nestjs/swagger';
import { AnnualAdministratorStatisticsData } from 'src/interfaces';
import { Auth } from '../auth/decorators';

@ApiTags('Admin Dashboard')
@ApiUnauthorizedResponse({ description: 'Unauthorized' })
@ApiInternalServerErrorResponse({ description: 'Internal server error' })
@ApiBadRequestResponse({ description: 'Bad request' })
@Controller({
  path: 'dashboard',
  version: '1',
})
@Auth()
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('annual-statistics')
  @ApiOperation({ summary: 'Obtener estadísticas administrativas anuales' })
  @ApiQuery({
    name: 'year',
    required: false,
    type: Number,
    description:
      'Año para el que se desean obtener las estadísticas (por defecto: año actual)',
  })
  @ApiResponse({
    status: 200,
    description: 'Estadísticas anuales obtenidas correctamente',
  })
  @ApiResponse({ status: 400, description: 'Solicitud incorrecta' })
  @ApiResponse({ status: 500, description: 'Error interno del servidor' })
  findAnnualStatistics(
    @Query('year', new DefaultValuePipe(new Date().getFullYear()), ParseIntPipe)
    year: number,
  ): Promise<AnnualAdministratorStatisticsData> {
    return this.dashboardService.findAnnualAdministratorStatistics(year);
  }
}
