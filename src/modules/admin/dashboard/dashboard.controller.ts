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
import {
  AnnualAdministratorStatisticsData,
  MonthlyBookingTrendData,
  MonthlyEarningsAndExpensesData,
  NextPendingPaymentsData,
  OccupationStatisticsPercentageData,
  RecentReservationsData,
  RoomOccupancyMapData,
} from 'src/interfaces';
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

  @Get('monthly-earnings-expenses')
  @ApiOperation({ summary: 'Obtener ganancias y gastos mensuales' })
  @ApiQuery({
    name: 'year',
    required: false,
    type: Number,
    description:
      'Año para el que se desean obtener las ganancias y gastos mensuales (por defecto: año actual)',
  })
  @ApiResponse({
    status: 200,
    description: 'Ganancias y gastos mensuales obtenidos correctamente',
  })
  @ApiResponse({ status: 400, description: 'Solicitud incorrecta' })
  @ApiResponse({ status: 500, description: 'Error interno del servidor' })
  findMonthlyEarningsExpenses(
    @Query('year', new DefaultValuePipe(new Date().getFullYear()), ParseIntPipe)
    year: number,
  ): Promise<MonthlyEarningsAndExpensesData[]> {
    return this.dashboardService.findMonthlyEarningsAndExpenses(year);
  }

  @Get('room-occupancy')
  @ApiOperation({ summary: 'Obtener mapa de ocupación de habitaciones' })
  @ApiResponse({
    status: 200,
    description: 'Mapa de ocupación obtenido correctamente',
  })
  @ApiResponse({ status: 400, description: 'Solicitud incorrecta' })
  @ApiResponse({ status: 500, description: 'Error interno del servidor' })
  findRoomOccupancy(): Promise<RoomOccupancyMapData> {
    return this.dashboardService.findRoomOccupancyMap();
  }

  @Get('recent-reservations')
  @ApiOperation({ summary: 'Obtener reservaciones recientes y del día actual' })
  @ApiResponse({
    status: 200,
    description: 'Reservaciones recientes obtenidas correctamente',
  })
  @ApiResponse({ status: 400, description: 'Solicitud incorrecta' })
  @ApiResponse({ status: 500, description: 'Error interno del servidor' })
  findRecentReservations(): Promise<RecentReservationsData> {
    return this.dashboardService.findRecentReservations();
  }

  @Get('next-pending-payments')
  @ApiOperation({ summary: 'Obtener próximos pagos pendientes' })
  @ApiResponse({
    status: 200,
    description: 'Próximos pagos pendientes obtenidos correctamente',
  })
  @ApiResponse({ status: 400, description: 'Solicitud incorrecta' })
  @ApiResponse({ status: 500, description: 'Error interno del servidor' })
  findNextPendingPayments(): Promise<NextPendingPaymentsData> {
    return this.dashboardService.findNextPendingPayments();
  }

  @Get('occupation-statistics')
  @ApiOperation({
    summary: 'Obtener estadísticas de ocupación por tipo de habitación',
  })
  @ApiQuery({
    name: 'year',
    required: false,
    type: Number,
    description:
      'Año para el que se desean obtener las estadísticas de ocupación (por defecto: año actual)',
  })
  @ApiResponse({
    status: 200,
    description: 'Estadísticas de ocupación obtenidas correctamente',
  })
  @ApiResponse({ status: 400, description: 'Solicitud incorrecta' })
  @ApiResponse({ status: 500, description: 'Error interno del servidor' })
  findOccupationStatistics(
    @Query('year', new DefaultValuePipe(new Date().getFullYear()), ParseIntPipe)
    year: number,
  ): Promise<OccupationStatisticsPercentageData[]> {
    return this.dashboardService.findOccupationStatisticsPercentage(year);
  }

  @Get('booking-trends')
  @ApiOperation({
    summary: 'Obtener tendencia mensual de reservaciones (web vs directas)',
  })
  @ApiQuery({
    name: 'year',
    required: false,
    type: Number,
    description:
      'Año para el que se desean obtener las tendencias de reservaciones (por defecto: año actual)',
  })
  @ApiResponse({
    status: 200,
    description: 'Tendencias de reservaciones obtenidas correctamente',
  })
  @ApiResponse({ status: 400, description: 'Solicitud incorrecta' })
  @ApiResponse({ status: 500, description: 'Error interno del servidor' })
  findBookingTrends(
    @Query('year', new DefaultValuePipe(new Date().getFullYear()), ParseIntPipe)
    year: number,
  ): Promise<MonthlyBookingTrendData[]> {
    return this.dashboardService.findMontlyBookingTrend(year);
  }
}
