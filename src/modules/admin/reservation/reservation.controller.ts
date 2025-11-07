import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Query,
  Patch,
  HttpStatus,
} from '@nestjs/common';
import { ReservationService } from './reservation.service';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { Auth, GetUser } from '../auth/decorators';
import { UserData, UserPayload } from 'src/interfaces';
import {
  PaginatedResponse,
  PaginationMetadata,
} from 'src/utils/paginated-response/PaginatedResponse.dto';
import {
  DetailedReservation,
  Reservation,
} from './entities/reservation.entity';
import {
  ApiBadRequestResponse,
  ApiExtraModels,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
  getSchemaPath,
} from '@nestjs/swagger';
import { Guest } from './entities/guest.entity';
import {
  CheckAvailabilityDto,
  RoomAvailabilityDto,
} from './dto/room-availability.dto';
import { DetailedRoom } from '../room/entities/room.entity';
import { UpdateReservationDto } from './dto/update-reservation.dto';
import { BaseApiResponse } from 'src/utils/base-response/BaseApiResponse.dto';
import { ReservationStatusDto } from './dto/reservation-status.dto';
import { ReservationStatusAvailableActions } from './entities/reservation.status-actions';
import { UpdateManyDto, UpdateManyResponseDto } from './dto/update-many.dto';
import { LateCheckoutDto } from './dto/late-checkout.dto';
import { ExtendStayDto } from './dto/extend-stay.dto';
import { ReasonResponseDto } from './dto/reasons-response.dto';

@ApiTags('Admin Reservations')
@ApiBadRequestResponse({
  description:
    'Bad Request - Error en la validación de datos o solicitud incorrecta',
})
@ApiUnauthorizedResponse({
  description: 'Unauthorized - No autorizado para realizar esta operación',
})
@ApiExtraModels(
  PaginatedResponse,
  PaginationMetadata,
  DetailedReservation,
  Guest,
  BaseApiResponse,
)
@Controller({ path: 'reservation', version: '1' })
@Auth()
export class ReservationController {
  constructor(private readonly reservationService: ReservationService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new reservation' })
  @ApiOkResponse({ type: Reservation, description: 'The created reservation' })
  create(
    @Body() createReservationDto: CreateReservationDto,
    @GetUser() user: UserData,
  ) {
    return this.reservationService.create(createReservationDto, user);
  }

  @Delete('deactivate')
  @ApiOperation({
    summary: 'Update reservation logic deletion status to deactivate',
  })
  @ApiOkResponse({
    type: UpdateManyResponseDto,
    description: 'The updated reservation',
  })
  @ApiBadRequestResponse({
    description: 'Bad Request - Error en la validación de datos',
  })
  deactivateReservations(
    @GetUser() user: UserData,
    @Body() body: UpdateManyDto,
  ) {
    return this.reservationService.deactivateReservations(body, user);
  }

  @Patch('reactivate')
  @ApiOperation({
    summary: 'Update reservation logic deletion status to reactivate',
  })
  @ApiOkResponse({
    type: UpdateManyResponseDto,
    description: 'The updated reservation',
  })
  @ApiBadRequestResponse({
    description: 'Bad Request - Error en la validación de datos',
  })
  reactivateReservations(
    @GetUser() user: UserData,
    @Body() body: UpdateManyDto,
  ) {
    return this.reservationService.reactivateReservations(body, user);
  }

  @Patch('transition-status/:id')
  @ApiOperation({
    summary: 'Update reservation status after being, can support all states',
  })
  @ApiParam({ name: 'id', description: 'Reservation ID' })
  @ApiOkResponse({
    type: Reservation,
    description: 'The updated reservation',
  })
  @ApiBadRequestResponse({
    description: 'Bad Request - Error en la validación de datos',
  })
  transitionStatus(
    @GetUser() user: UserData,
    @Param('id') id: string,
    @Body() body: ReservationStatusDto,
  ) {
    return this.reservationService.changeReservationStatus(
      id,
      body.status,
      user,
    );
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a reservation' })
  @ApiParam({ name: 'id', description: 'Reservation ID' })
  @ApiOkResponse({
    type: Reservation,
    description: 'The updated reservation',
  })
  @ApiBadRequestResponse({
    description: 'Bad Request - Error en la validación de datos',
  })
  update(
    @Param('id') id: string,
    @Body() updateReservationDto: UpdateReservationDto,
    @GetUser() user: UserData,
  ) {
    return this.reservationService.update(id, updateReservationDto, user);
  }

  // @Patch('/check-out/:id')
  // @ApiOperation({
  //   summary: 'Update a reservation status after being checkedin',
  // })
  // @ApiParam({ name: 'id', description: 'Reservation ID' })
  // @ApiOkResponse({
  //   type: Reservation,
  //   description: 'The updated reservation',
  // })
  // @ApiBadRequestResponse({
  //   description: 'Bad Request - Error en la validación de datos',
  // })
  // closeCheckOut(
  //   @Param('id') id: string,
  //   @Body() updateReservationDto: UpdateReservationDto,
  //   @GetUser() user: UserData,
  // ) {
  //   return this.reservationService.update(id, updateReservationDto, user);
  // }

  // @Patch('/cancel/:id')
  // @ApiOperation({
  //   summary:
  //     'Update a reservation status after creating it, but before confirming it',
  // })
  // @ApiParam({ name: 'id', description: 'Reservation ID' })
  // @ApiOkResponse({
  //   type: Reservation,
  //   description: 'The updated reservation',
  // })
  // @ApiBadRequestResponse({
  //   description: 'Bad Request - Error en la validación de datos',
  // })
  // cancelReservation(
  //   @Param('id') id: string,
  //   @Body() updateReservationDto: UpdateReservationDto,
  //   @GetUser() user: UserData,
  // ) {
  //   return this.reservationService.update(id, updateReservationDto, user);
  // }

  @Get()
  @ApiOperation({ summary: 'Get all reservations' })
  @ApiOkResponse({
    type: [Reservation],
    description: 'List of all reservations',
  })
  findAll() {
    return this.reservationService.findAll();
  }

  @Get('available-actions/:id')
  @ApiOperation({
    summary: 'Get Available Actions for transition reservation status',
  })
  @ApiOkResponse({
    type: ReservationStatusAvailableActions,
    description: 'List of all reservations',
  })
  validateReservationStatusAvailableActions(
    // @GetUser() user: UserData,
    @Param('id') id: string,
  ) {
    return this.reservationService.validateStatusTransitionActions(id);
  }

  @Get('paginated')
  @ApiOperation({ summary: 'Get paginated reservations' })
  @ApiQuery({
    name: 'page',
    description: 'Page number',
    type: Number,
    example: 1,
    required: false,
  })
  @ApiQuery({
    name: 'pageSize',
    description: 'Number of items per page',
    type: Number,
    example: 10,
    required: false,
  })
  @ApiQuery({
    name: 'customerId',
    description: 'Customer ID to filter reservations',
    type: String,
    required: false,
  })
  @ApiQuery({
    name: 'checkInDate',
    description: 'Check-in date to filter reservations',
    type: String,
    required: false,
  })
  @ApiQuery({
    name: 'checkOutDate',
    description: 'Check-out date to filter reservations',
    type: String,
    required: false,
  })
  @ApiQuery({
    name: 'search',
    description:
      'Search term to filter reservations by customer fields (name, email, phone, address, birthPlace, country, department, province, occupation, documentNumber, companyName, ruc, companyAddress, blacklistReason), room fields (number, room type name), and user fields (receptionist name, email)',
    type: String,
    required: false,
  })
  @ApiQuery({
    name: 'isActive',
    description:
      'Filter by active status (true/false). Can pass multiple values comma-separated',
    type: String,
    required: false,
    example: 'true,false',
  })
  @ApiQuery({
    name: 'isPendingDeletePayment',
    description:
      'Filter by pending delete payment status (true/false). Can pass multiple values comma-separated',
    type: String,
    required: false,
    example: 'true,false',
  })
  @ApiQuery({
    name: 'status',
    description:
      'Filter by reservation status. Can pass multiple values comma-separated',
    type: String,
    required: false,
    example: 'CONFIRMED,CHECKED_IN',
  })
  @ApiQuery({
    name: 'sortBy',
    description: 'Field to sort by',
    type: String,
    required: false,
    example: 'createdAt',
  })
  @ApiQuery({
    name: 'sortOrder',
    description: 'Sort order (asc/desc)',
    type: String,
    required: false,
    example: 'desc',
  })
  @ApiOkResponse({
    schema: {
      title: 'DetailedReservationPaginatedResponse',
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: { $ref: getSchemaPath(DetailedReservation) },
        },
        meta: { $ref: getSchemaPath(PaginationMetadata) },
      },
    },
    description: 'Paginated list of detailed reservations',
  })
  findAllPaginated(
    @GetUser() user: UserPayload,
    @Query('page') page: string = '1',
    @Query('pageSize') pageSize: string = '10',
    @Query('customerId') customerId?: string,
    @Query('checkInDate') checkInDate?: string,
    @Query('checkOutDate') checkOutDate?: string,
    @Query('search') search?: string,
    @Query('isActive') isActive?: string,
    @Query('isPendingDeletePayment') isPendingDeletePayment?: string,
    @Query('status') status?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: string,
  ): Promise<PaginatedResponse<DetailedReservation>> {
    const pageNumber = parseInt(page, 10) ?? 1;
    const pageSizeNumber = parseInt(pageSize, 10) ?? 10;

    // Parse array parameters
    const parseArrayParam = (param?: string) => {
      if (!param) return undefined;
      return param.split(',').map((item) => {
        const trimmed = item.trim();
        if (trimmed === 'true') return true;
        if (trimmed === 'false') return false;
        return trimmed;
      });
    };

    // Build filter options
    const filterOptions: any = {};

    // Search functionality - ROBUST AND COMPLETE
    if (search) {
      // 1. Campos directos de la reserva
      filterOptions.searchByField = {
        origin: search,
        reason: search,
      };

      // 2. Campos relacionales - Customer
      filterOptions.searchByFieldsRelational = [
        {
          customer: {
            // Campos principales del cliente
            name: search,
            department: search,
            province: search,
            country: search,
            email: search,
            phone: search,
            documentNumber: search,
            companyName: search,
            address: search,
            birthPlace: search,
            occupation: search,
            companyAddress: search,
            ruc: search,
            blacklistReason: search,
          },
        },
        // 3. Campos relacionales - Room y RoomTypes
        {
          room: {
            // Número de habitación (si es numérico)
            ...(isNaN(Number(search)) ? {} : { number: Number(search) }),
            // Tipo de habitación
            RoomTypes: { name: search },
          },
        },
        // 4. Campos relacionales - User (recepcionista)
        {
          user: {
            name: search,
            email: search,
          },
        },
      ];

      // 5. Búsqueda en campo JSON guests (combinar con OR existente)
      // Para campos JSONB en PostgreSQL, usar string_contains para buscar en todo el JSON
      filterOptions.OR = [
        {
          guests: {
            string_contains: search,
          },
        },
      ];
    }

    // Boolean array filters
    if (isActive) {
      const isActiveArray = parseArrayParam(isActive);
      if (isActiveArray && isActiveArray.length === 1) {
        // Si es un solo valor, usar equals en lugar de in
        filterOptions.searchByField = {
          ...filterOptions.searchByField,
          isActive: isActiveArray[0],
        };
      } else if (isActiveArray && isActiveArray.length > 1) {
        // Si son múltiples valores, usar in
        filterOptions.arrayByField = {
          ...filterOptions.arrayByField,
          isActive: isActiveArray,
        };
      }
    }

    if (isPendingDeletePayment) {
      const isPendingArray = parseArrayParam(isPendingDeletePayment);
      if (isPendingArray && isPendingArray.length === 1) {
        // Si es un solo valor, usar equals en lugar de in
        filterOptions.searchByField = {
          ...filterOptions.searchByField,
          isPendingDeletePayment: isPendingArray[0],
        };
      } else if (isPendingArray && isPendingArray.length > 1) {
        // Si son múltiples valores, usar in
        filterOptions.arrayByField = {
          ...filterOptions.arrayByField,
          isPendingDeletePayment: isPendingArray,
        };
      }
    }

    if (status) {
      filterOptions.arrayByField = {
        ...filterOptions.arrayByField,
        status: parseArrayParam(status),
      };
    }

    // Sort options
    const sortOptions = sortBy
      ? {
          field: sortBy as keyof Reservation,
          order: (sortOrder as 'asc' | 'desc') || 'desc',
        }
      : undefined;

    return this.reservationService.findManyPaginated(
      user,
      {
        page: pageNumber,
        pageSize: pageSizeNumber,
      },
      // Legacy params for backward compatibility
      {
        customerId,
        checkInDate,
        checkOutDate,
      },
      // New advanced filter options
      filterOptions,
      sortOptions,
    );
  }

  @Get('available-rooms')
  @ApiOperation({ summary: 'Obtener habitaciones disponibles' })
  @ApiQuery({
    name: 'checkInDate',
    description: 'Fecha de check-in en formato ISO',
    type: String,
    required: true,
    example: '2025-04-01T14:00:00.000Z',
  })
  @ApiQuery({
    name: 'checkOutDate',
    description: 'Fecha de check-out en formato ISO',
    type: String,
    required: true,
    example: '2025-04-05T12:00:00.000Z',
  })
  @ApiOkResponse({
    type: [DetailedRoom],
    description: 'Lista de habitaciones disponibles',
  })
  async getAvailableRooms(
    @Query('checkInDate') checkInDate: string,
    @Query('checkOutDate') checkOutDate: string,
    @Query('forUpdate') forUpdate: boolean = false,
    @Query('reservationId') reservationId?: string,
  ): Promise<DetailedRoom[]> {
    return this.reservationService.getAllAvailableRooms(
      checkInDate,
      checkOutDate,
      forUpdate,
      reservationId,
    );
  }

  @Get('reservations-in-interval')
  @ApiOperation({
    summary:
      'Obtener todas las reservaciones disponibles en un intervalo de tiempo',
  })
  @ApiQuery({
    name: 'checkInDate',
    description: 'Fecha de check-in en formato ISO',
    type: String,
    required: true,
    example: '2025-04-01T14:00:00.000Z',
  })
  @ApiQuery({
    name: 'checkOutDate',
    description: 'Fecha de check-out en formato ISO',
    type: String,
    required: true,
    example: '2025-04-05T12:00:00.000Z',
  })
  @ApiOkResponse({
    type: [DetailedReservation],
    description: 'Lista de reservaciones disponibles en un inetravlo de tiempo',
  })
  async getReservationInInterval(
    @Query('checkInDate') checkInDate: string,
    @Query('checkOutDate') checkOutDate: string,
    @Query('forUpdate') forUpdate: boolean = false,
    @Query('reservationId') reservationId?: string,
  ): Promise<DetailedReservation[]> {
    return this.reservationService.getAllReservationsInTimeInterval(
      checkInDate,
      checkOutDate,
      forUpdate,
      reservationId,
    );
  }

  @Get('check-availability')
  @ApiOperation({ summary: 'Verificar disponibilidad de habitación' })
  @ApiQuery({
    name: 'roomId',
    description: 'ID de la habitación',
    type: String,
    required: true,
  })
  @ApiQuery({
    name: 'checkInDate',
    description: 'Fecha de check-in en formato ISO',
    type: String,
    required: true,
    example: '2025-04-01T14:00:00.000Z',
  })
  @ApiQuery({
    name: 'checkOutDate',
    description: 'Fecha de check-out en formato ISO',
    type: String,
    required: true,
    example: '2025-04-05T12:00:00.000Z',
  })
  @ApiOkResponse({
    type: RoomAvailabilityDto,
    description: 'Información de disponibilidad de la habitación',
  })
  async checkAvailability(
    @Query('roomId') roomId: string,
    @Query('checkInDate') checkInDate: string,
    @Query('checkOutDate') checkOutDate: string,
    @Query('forUpdate') forUpdate: boolean = false,
    @Query('reservationId') reservationId?: string,
  ): Promise<RoomAvailabilityDto> {
    const checkAvailabilityDto: CheckAvailabilityDto = {
      roomId,
      checkInDate,
      checkOutDate,
    };

    return this.reservationService.checkAvailability(
      checkAvailabilityDto,
      forUpdate,
      reservationId,
    );
  }

  @Get(':id/check-extended-checkout')
  @ApiOperation({
    summary: 'Verificar disponibilidad para extender checkout',
    description:
      'Comprueba si es posible aplicar un late checkout o extender estadía sin generar conflictos',
  })
  @ApiParam({
    name: 'id',
    description: 'ID de la reserva',
    type: String,
    required: true,
  })
  @ApiQuery({
    name: 'newCheckoutDate',
    description: 'Nueva fecha/hora de checkout en formato ISO',
    type: String,
    required: true,
    example: '2025-05-10T14:00:00.000Z',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Verificación completada',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Error: formato incorrecto o reserva no encontrada',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Error: reservación no encontrada',
  })
  async checkExtendedCheckoutAvailability(
    @Param('id') id: string,
    @Query('newCheckoutDate') newCheckoutDate: string,
  ) {
    return this.reservationService.checkExtendedCheckoutAvailability(
      id,
      newCheckoutDate,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a reservation by ID' })
  @ApiParam({ name: 'id', description: 'Reservation ID' })
  @ApiOkResponse({
    type: Reservation,
    description: 'The found reservation',
  })
  findOne(@Param('id') id: string) {
    return this.reservationService.findOne(id);
  }

  @Patch(':id/late-checkout')
  @ApiOperation({
    summary: 'Aplicar Late Checkout a una reserva',
    description:
      'Extiende la hora de salida de una reserva en el mismo día. Valida que no haya conflictos con otras reservas.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Late checkout aplicado correctamente',
    type: BaseApiResponse,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description:
      'Error: formato incorrecto o reserva incompatible con late checkout',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Error: conflicto con otra reservación existente',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Error: reservación no encontrada',
  })
  applyLateCheckout(
    @Param('id') id: string,
    @Body() lateCheckoutDto: LateCheckoutDto,
    @GetUser() user: UserPayload,
  ): Promise<BaseApiResponse<Reservation>> {
    return this.reservationService.applyLateCheckout(id, lateCheckoutDto, user);
  }

  @Delete(':id/late-checkout')
  @ApiOperation({
    summary: 'Eliminar Late Checkout de una reserva',
    description:
      'Elimina el Late Checkout aplicado a una reserva y restaura la hora original de salida.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Late checkout eliminado correctamente',
    type: BaseApiResponse,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description:
      'Error: La reserva no tiene Late Checkout aplicado o no está en estado válido',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Error: Reserva no encontrada',
  })
  removeLateCheckout(
    @Param('id') id: string,
    @GetUser() user: UserPayload,
  ): Promise<BaseApiResponse<Reservation>> {
    return this.reservationService.removeLateCheckout(id, user);
  }

  @Patch(':id/extend-stay')
  @ApiOperation({
    summary: 'Extender estadía de una reserva',
    description:
      'Cambia la fecha de checkout a una fecha posterior. Valida disponibilidad y conflictos.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Estadía extendida correctamente',
    type: BaseApiResponse,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description:
      'Error: formato incorrecto de fecha o reserva incompatible con extensión',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Error: conflicto con otra reservación existente',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Error: reservación no encontrada',
  })
  extendStay(
    @Param('id') id: string,
    @Body() extendStayDto: ExtendStayDto,
    @GetUser() user: UserPayload,
  ): Promise<BaseApiResponse<Reservation>> {
    return this.reservationService.extendStay(id, extendStayDto, user);
  }

  @Get('all/reasons')
  @ApiOperation({
    summary: 'Obtener todas las razones únicas de las reservas',
    description:
      'Retorna una lista de todas las razones únicas utilizadas en las reservas, ordenadas alfabéticamente',
  })
  @ApiOkResponse({
    description: 'Lista de razones únicas de reservas',
    type: [ReasonResponseDto],
  })
  async getAllReasons(): Promise<ReasonResponseDto[]> {
    const reasons = await this.reservationService.getAllReasons();
    return reasons;
  }
}
