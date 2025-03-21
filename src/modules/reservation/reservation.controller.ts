import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { ReservationService } from './reservation.service';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { UpdateReservationDto } from './dto/update-reservation.dto';
import { Auth, GetUser } from '../admin/auth/decorators';
import { UserData } from 'src/interfaces';
import { PaginatedResponse } from 'src/utils/paginated-response/PaginatedResponse.dto';
import {
  DetailedReservation,
  Reservation,
} from './entities/reservation.entity';
import {
  ApiBadRequestResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

@ApiTags('Reservations')
@ApiBadRequestResponse({
  description:
    'Bad Request - Error en la validación de datos o solicitud incorrecta',
})
@ApiUnauthorizedResponse({
  description: 'Unauthorized - No autorizado para realizar esta operación',
})
@Controller('reservation')
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
  @ApiOkResponse({
    type: [DetailedReservation],
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

  @Get(':id')
  @ApiOperation({ summary: 'Get a reservation by ID' })
  @ApiParam({ name: 'id', description: 'Reservation ID' })
  @ApiOkResponse({
    type: DetailedReservation,
    description: 'The found reservation',
  })
  findOne(@Param('id') id: string) {
    return this.reservationService.findOne(+id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a reservation' })
  @ApiParam({ name: 'id', description: 'Reservation ID' })
  @ApiOkResponse({ type: Reservation, description: 'The updated reservation' })
  update(
    @Param('id') id: string,
    @Body() updateReservationDto: UpdateReservationDto,
  ) {
    return this.reservationService.update(+id, updateReservationDto);
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
}
