import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { LandingReservationService } from './reservation.service';
import {
  ApiExtraModels,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { DetailedRoom } from 'src/modules/admin/room/entities/room.entity';
import { CheckAvailableRoomsQueryDto } from './dto/landing-check-available-rooms.dto';
import { defaultLocale, SupportedLocales } from '../i18n/translations';
import { Reservation } from 'src/modules/admin/reservation/entities/reservation.entity';
import { CreateLandingReservationDto } from './dto/create-reservation.dto';
import { BaseReservationWsActionsDto } from './dto/reservation-ws.dto';
import {
  BaseWsErrorResponse,
  BaseWsResponse,
} from 'src/websockets/dto/base-response.dto';
import {
  OnConnectionResponse,
  StartBookingReservationResponseDto,
} from './websockets/reservation.ws.dto';
import { ConfirmBookingDto } from './dto/confirm-reservation.dto';

@ApiTags('Landing Reservations')
@ApiExtraModels(
  BaseReservationWsActionsDto,
  BaseWsResponse,
  StartBookingReservationResponseDto,
  BaseWsErrorResponse,
  OnConnectionResponse,
)
@Controller({ path: 'landing-reservation', version: '1' })
export class ReservationController {
  constructor(private readonly reservationService: LandingReservationService) {}

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
    @Query() checkAvailabilityQueryDto: CheckAvailableRoomsQueryDto,
  ) {
    const { checkInDate, checkOutDate, guestNumber, roomId, locale } =
      checkAvailabilityQueryDto;
    return this.reservationService.checkAvailableRooms({
      locale,
      checkInDate,
      checkOutDate,
      guestNumber,
      roomId,
    });
  }

  @Get('check-reservation-exists/:id')
  @ApiOperation({ summary: 'Check if a reservation exists' })
  @ApiQuery({
    name: 'reservationId',
    required: true,
    type: String,
    description: 'ID of the reservation to check',
  })
  @ApiResponse({
    status: 200,
    description: 'Reservation exists',
  })
  @ApiResponse({ status: 404, description: 'Reservation not found' })
  checkReservationExists(@Param('id') reservationId: string) {
    return this.reservationService.checkReservationExists(reservationId);
  }

  @Post('create-reservation')
  @ApiOperation({ summary: 'Create a reservation' })
  @ApiResponse({
    status: 201,
    description: 'Reservation created successfully',
    type: Reservation,
  })
  @ApiResponse({ status: 400, description: 'Invalid input parameters' })
  @ApiResponse({ status: 404, description: 'Room not found' })
  createLandingReservation(
    @Query('locale') locale: SupportedLocales = defaultLocale,
    @Body() createReservationDto: CreateLandingReservationDto,
  ) {
    return this.reservationService.createLandingReservation(
      createReservationDto,
      locale,
    );
  }

  @Post('confirm-reservation')
  @ApiOperation({ summary: 'Confirm a reservation' })
  @ApiResponse({
    status: 200,
    description: 'Reservation confirmed successfully',
    type: Reservation,
  })
  @ApiResponse({ status: 400, description: 'Invalid input parameters' })
  confirmReservation(
    @Query('locale') locale: SupportedLocales = defaultLocale,
    @Query('reservationId') reservationId: string,
    @Body() confirmReservationDto: ConfirmBookingDto,
  ) {
    return this.reservationService.confirmReservationForController(
      reservationId,
      locale,
      confirmReservationDto,
    );
  }
}
