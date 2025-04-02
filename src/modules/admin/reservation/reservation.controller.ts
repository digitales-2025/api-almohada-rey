import {
  Controller,
  Get,
  Post,
  Body,
  // Patch,
  Param,
  Delete,
  Query,
  Patch,
} from '@nestjs/common';
import { ReservationService } from './reservation.service';
import { CreateReservationDto } from './dto/create-reservation.dto';
// import { UpdateReservationDto } from './dto/update-reservation.dto';
import { Auth, GetUser } from '../auth/decorators';
import { UserData } from 'src/interfaces';
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

@ApiTags('Reservations')
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

  @Get()
  @ApiOperation({ summary: 'Get all reservations' })
  @ApiOkResponse({
    type: [Reservation],
    description: 'List of all reservations',
  })
  findAll() {
    return this.reservationService.findAll();
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
  // export class PaginationMetadata {
  //   @ApiProperty({ description: 'Total number of items', type: Number })
  //   total: number;

  //   @ApiProperty({ description: 'Current page number', type: Number })
  //   page: number;

  //   @ApiProperty({ description: 'Number of items per page', type: Number })
  //   pageSize: number;

  //   @ApiProperty({ description: 'Total number of pages', type: Number })
  //   totalPages: number;

  //   @ApiProperty({ description: 'Whether there is a next page', type: Boolean })
  //   hasNext: boolean;

  //   @ApiProperty({
  //     description: 'Whether there is a previous page',
  //     type: Boolean,
  //   })
  //   hasPrevious: boolean;
  // }

  // export class PaginatedResponse<T> implements PaginatedResult<T> {
  //   @ApiProperty({ description: 'The paginated data', isArray: true })
  //   data: T[];

  //   @ApiProperty({ description: 'Pagination metadata', type: PaginationMetadata })
  //   meta: PaginationMetadata;
  // }
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
    @Query('page') page: string = '1',
    @Query('pageSize') pageSize: string = '10',
  ): Promise<PaginatedResponse<DetailedReservation>> {
    const pageNumber = parseInt(page, 10) ?? 1;
    const pageSizeNumber = parseInt(pageSize, 10) ?? 10;
    // TODO: Update service to use pagination parameters
    return this.reservationService.findManyPaginated({
      page: pageNumber,
      pageSize: pageSizeNumber,
    });
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
    // const checkAvailabilityDto: CheckAvailabilityDto = {
    //   roomId: '',
    //   checkInDate,
    //   checkOutDate,
    // };

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

  // @Patch(':id')
  // @ApiOperation({ summary: 'Update a reservation' })
  // @ApiParam({ name: 'id', description: 'Reservation ID' })
  // @ApiOkResponse({ type: Reservation, description: 'The updated reservation' })
  // update(
  //   @Param('id') id: string,
  //   @Body() updateReservationDto: UpdateReservationDto,
  // ) {
  //   return this.reservationService.update(id, updateReservationDto);
  // }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a reservation' })
  @ApiParam({ name: 'id', description: 'Reservation ID' })
  @ApiOkResponse({
    description: 'The reservation has been successfully deleted',
  })
  remove(@Param('id') id: string) {
    return this.reservationService.remove(+id);
  }
}
