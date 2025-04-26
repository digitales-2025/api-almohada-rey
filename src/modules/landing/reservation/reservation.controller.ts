import {
  Controller,
  Get,
  //   Post,
  //   Body,
  //   Patch,
  //   Param,
  //   Delete,
  Query,
} from '@nestjs/common';
import { LandingReservationService } from './reservation.service';
// import { CreateReservationDto } from './dto/create-reservation.dto';
// import { UpdateReservationDto } from './dto/update-reservation.dto';
import { ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { DetailedRoom } from 'src/modules/admin/room/entities/room.entity';

@Controller('reservation')
export class ReservationController {
  constructor(private readonly reservationService: LandingReservationService) {}

  //   @Post()
  //   create(@Body() createReservationDto: CreateReservationDto) {
  //     return this.reservationService.create(createReservationDto);
  //   }

  //   @Get()
  //   findAll() {
  //     return this.reservationService.findAll();
  //   }

  //   @Get(':id')
  //   findOne(@Param('id') id: string) {
  //     return this.reservationService.findOne(+id);
  //   }

  //   @Patch(':id')
  //   update(
  //     @Param('id') id: string,
  //     @Body() updateReservationDto: UpdateReservationDto,
  //   ) {
  //     return this.reservationService.update(+id, updateReservationDto);
  //   }

  //   @Delete(':id')
  //   remove(@Param('id') id: string) {
  //     return this.reservationService.remove(+id);
  //   }

  /**
   * Checks for available rooms based on the given criteria.
   *
   * @param checkInDate - The check-in date in string format (e.g., 'YYYY-MM-DD')
   * @param checkOutDate - The check-out date in string format (e.g., 'YYYY-MM-DD')
   * @param guestNumber - The number of guests
   * @param roomId - Optional room ID to check availability for a specific room
   *
   * @returns {Promise<AvailableRoomsResponse[]>} Array of available rooms matching the criteria
   *
   * @example
   * GET /reservations/check-available?checkInDate=2023-12-01&checkOutDate=2023-12-05&guestNumber=2
   *
   */
  @Get('check-available-rooms')
  @ApiOperation({ summary: 'Check available rooms for reservation' })
  @ApiQuery({
    name: 'checkInDate',
    required: true,
    type: String,
    description: 'Check-in date (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'checkOutDate',
    required: true,
    type: String,
    description: 'Check-out date (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'guestNumber',
    required: true,
    type: Number,
    description: 'Number of guests',
  })
  @ApiQuery({
    name: 'roomId',
    required: false,
    type: String,
    description: 'Optional room ID',
  })
  @ApiResponse({
    status: 200,
    description: 'List of available rooms',
    type: [DetailedRoom],
  })
  @ApiResponse({ status: 400, description: 'Invalid input parameters' })
  checkAvailableRooms(
    @Query('checkInDate') checkInDate: string,
    @Query('checkOutDate') checkOutDate: string,
    @Query('guestNumber') guestNumber: number,
    @Query('roomId') roomId?: string,
  ) {
    return this.reservationService.checkAvilableRooms({
      checkInDate,
      checkOutDate,
      guestNumber,
      roomId,
    });
  }
}
