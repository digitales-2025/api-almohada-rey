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
  AmenitiesByPriorityData,
  AnnualAdministratorStatisticsData,
  CustomerOriginSummaryData,
  MonthlyBookingTrendData,
  MonthlyCustomerOriginData,
  MonthlyEarningsAndExpensesData,
  NextPendingPaymentsData,
  OccupationStatisticsPercentageData,
  RecentReservationsData,
  RoomOccupancyMapData,
  SummaryFinanceData,
  TodayAvailableRoomsData,
  TodayRecepcionistStatisticsData,
  Top10CountriesProvincesData,
  Top5PriorityPendingAmenitiesData,
  Top5TodayCheckInData,
  Top5TodayCheckOutData,
  WeekReservationsData,
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

  @Get('summary-finance')
  @ApiOperation({
    summary: 'Obtener resumen financiero',
  })
  @ApiQuery({
    name: 'year',
    required: false,
    type: Number,
    description:
      'Año para el que se desea obtener el resumen financiero (por defecto: año actual)',
  })
  @ApiResponse({
    status: 200,
    description: 'Resumen financiero obtenido correctamente',
  })
  @ApiResponse({ status: 400, description: 'Solicitud incorrecta' })
  @ApiResponse({ status: 500, description: 'Error interno del servidor' })
  findSummaryFinance(
    @Query('year', new DefaultValuePipe(new Date().getFullYear()), ParseIntPipe)
    year: number,
  ): Promise<SummaryFinanceData> {
    return this.dashboardService.findSummaryFinance(year);
  }

  @Get('customer-origin')
  @ApiOperation({
    summary: 'Obtener resumen del origen de los clientes',
  })
  @ApiQuery({
    name: 'year',
    required: false,
    type: Number,
    description:
      'Año para el que se desea obtener el resumen de origen de clientes (por defecto: año actual)',
  })
  @ApiResponse({
    status: 200,
    description: 'Resumen de origen de clientes obtenido correctamente',
  })
  @ApiResponse({ status: 400, description: 'Solicitud incorrecta' })
  @ApiResponse({ status: 500, description: 'Error interno del servidor' })
  findCustomerOriginSummary(
    @Query('year', new DefaultValuePipe(new Date().getFullYear()), ParseIntPipe)
    year: number,
  ): Promise<CustomerOriginSummaryData> {
    return this.dashboardService.findCustomerOriginSummary(year);
  }

  @Get('monthly-customer-origin')
  @ApiOperation({
    summary:
      'Obtener distribución mensual de clientes nacionales e internacionales',
  })
  @ApiQuery({
    name: 'year',
    required: false,
    type: Number,
    description:
      'Año para el que se desea obtener la distribución mensual de clientes (por defecto: año actual)',
  })
  @ApiResponse({
    status: 200,
    description: 'Distribución mensual de clientes obtenida correctamente',
  })
  @ApiResponse({ status: 400, description: 'Solicitud incorrecta' })
  @ApiResponse({ status: 500, description: 'Error interno del servidor' })
  findMonthlyCustomerOrigin(
    @Query('year', new DefaultValuePipe(new Date().getFullYear()), ParseIntPipe)
    year: number,
  ): Promise<MonthlyCustomerOriginData[]> {
    return this.dashboardService.findMonthlyCustomerOrigin(year);
  }

  @Get('top-countries')
  @ApiOperation({
    summary: 'Obtener top 10 países con más clientes (excluyendo Perú)',
  })
  @ApiQuery({
    name: 'year',
    required: false,
    type: Number,
    description:
      'Año para el que se desea obtener el top de países (por defecto: año actual)',
  })
  @ApiResponse({
    status: 200,
    description: 'Top 10 países obtenidos correctamente',
  })
  @ApiResponse({ status: 400, description: 'Solicitud incorrecta' })
  @ApiResponse({ status: 500, description: 'Error interno del servidor' })
  findTop10Countries(
    @Query('year', new DefaultValuePipe(new Date().getFullYear()), ParseIntPipe)
    year: number,
  ): Promise<Top10CountriesProvincesData[]> {
    return this.dashboardService.findTop10CountriesCustomers(year);
  }

  @Get('top-provinces')
  @ApiOperation({
    summary: 'Obtener top 10 provincias de Perú con más clientes',
  })
  @ApiQuery({
    name: 'year',
    required: false,
    type: Number,
    description:
      'Año para el que se desea obtener el top de provincias (por defecto: año actual)',
  })
  @ApiResponse({
    status: 200,
    description: 'Top 10 provincias obtenidas correctamente',
  })
  @ApiResponse({ status: 400, description: 'Solicitud incorrecta' })
  @ApiResponse({ status: 500, description: 'Error interno del servidor' })
  findTop10Provinces(
    @Query('year', new DefaultValuePipe(new Date().getFullYear()), ParseIntPipe)
    year: number,
  ): Promise<Top10CountriesProvincesData[]> {
    return this.dashboardService.findTop10ProvincesCustomers(year);
  }

  @Get('today-receptionist-statistics')
  @ApiOperation({
    summary: 'Obtener estadísticas diarias para recepcionistas',
  })
  @ApiResponse({
    status: 200,
    description: 'Estadísticas diarias obtenidas correctamente',
  })
  @ApiResponse({ status: 400, description: 'Solicitud incorrecta' })
  @ApiResponse({ status: 500, description: 'Error interno del servidor' })
  findTodayRecepcionistStatistics(): Promise<TodayRecepcionistStatisticsData> {
    return this.dashboardService.findTodayRecepcionistStatistics();
  }

  @Get('top-today-check-ins')
  @ApiOperation({
    summary: 'Obtener los 5 próximos check-ins programados para hoy',
  })
  @ApiResponse({
    status: 200,
    description: 'Top 5 check-ins obtenidos correctamente',
  })
  @ApiResponse({ status: 400, description: 'Solicitud incorrecta' })
  @ApiResponse({ status: 500, description: 'Error interno del servidor' })
  findTop5TodayCheckIns(): Promise<Top5TodayCheckInData[]> {
    return this.dashboardService.findTop5TodayCheckIn();
  }

  @Get('top-today-check-outs')
  @ApiOperation({
    summary: 'Obtener los 5 próximos check-outs programados para hoy',
  })
  @ApiResponse({
    status: 200,
    description: 'Top 5 check-outs obtenidos correctamente',
  })
  @ApiResponse({ status: 400, description: 'Solicitud incorrecta' })
  @ApiResponse({ status: 500, description: 'Error interno del servidor' })
  findTop5TodayCheckOuts(): Promise<Top5TodayCheckOutData[]> {
    return this.dashboardService.findTop5TodayCheckOut();
  }

  @Get('top-priority-amenities')
  @ApiOperation({
    summary:
      'Obtener las 5 habitaciones con mayor prioridad de reposición de amenidades',
  })
  @ApiResponse({
    status: 200,
    description:
      'Top 5 habitaciones con amenidades prioritarias obtenidas correctamente',
  })
  @ApiResponse({ status: 400, description: 'Solicitud incorrecta' })
  @ApiResponse({ status: 500, description: 'Error interno del servidor' })
  findTop5PriorityAmenities(): Promise<Top5PriorityPendingAmenitiesData[]> {
    return this.dashboardService.findTop5PriorityPendingAmenities();
  }

  @Get('priority-amenities-grouped')
  @ApiOperation({
    summary:
      'Obtener habitaciones con amenidades pendientes agrupadas por nivel de prioridad',
  })
  @ApiResponse({
    status: 200,
    description:
      'Habitaciones con amenidades agrupadas por prioridad obtenidas correctamente',
  })
  @ApiResponse({ status: 400, description: 'Solicitud incorrecta' })
  @ApiResponse({ status: 500, description: 'Error interno del servidor' })
  findAmenitiesByPriority(): Promise<AmenitiesByPriorityData> {
    return this.dashboardService.findAmenitiesByPriority();
  }

  @Get('today-available-rooms')
  @ApiOperation({
    summary: 'Obtener habitaciones disponibles para hoy sin reservas',
  })
  @ApiResponse({
    status: 200,
    description: 'Habitaciones disponibles obtenidas correctamente',
  })
  @ApiResponse({ status: 400, description: 'Solicitud incorrecta' })
  @ApiResponse({ status: 500, description: 'Error interno del servidor' })
  findTodayAvailableRooms(): Promise<TodayAvailableRoomsData[]> {
    return this.dashboardService.findTodayAvailableRooms();
  }

  @Get('week-reservations')
  @ApiOperation({
    summary: 'Obtener información sobre reservaciones para la semana actual',
  })
  @ApiResponse({
    status: 200,
    description: 'Información de reservaciones obtenida correctamente',
  })
  @ApiResponse({ status: 400, description: 'Solicitud incorrecta' })
  @ApiResponse({ status: 500, description: 'Error interno del servidor' })
  findWeekReservations(): Promise<WeekReservationsData> {
    return this.dashboardService.findWeekReservations();
  }
}
