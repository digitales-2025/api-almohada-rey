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
  ): Promise<PaginatedResponse<DetailedReservation>> {
    const pageNumber = parseInt(page, 10) ?? 1;
    const pageSizeNumber = parseInt(pageSize, 10) ?? 10;
    // TODO: Update service to use pagination parameters
    return this.reservationService.findManyPaginated(
      user,
      {
        page: pageNumber,
        pageSize: pageSizeNumber,
      },
      {
        customerId,
        checkInDate,
        checkOutDate,
      },
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
    // const checkAvailabilityDto: CheckAvailabilityDto = {
    //   roomId: '',
    //   checkInDate,
    //   checkOutDate,
    // };

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

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a reservation' })
  @ApiParam({ name: 'id', description: 'Reservation ID' })
  @ApiOkResponse({
    description: 'The reservation has been successfully deleted',
  })
  remove(@Param('id') id: string) {
    return this.reservationService.remove(+id);
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
    return this.reservationService.applyLateCheckout(
      id,
      lateCheckoutDto.newCheckoutTime,
      user,
    );
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
    return this.reservationService.extendStay(
      id,
      extendStayDto.newCheckoutDate,
      user,
    );
  }
}
