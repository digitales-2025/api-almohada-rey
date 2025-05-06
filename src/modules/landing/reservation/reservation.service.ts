import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { reservationErrorMessages } from 'src/modules/admin/reservation/errors/errors.reservation';
import { ReservationRepository } from 'src/modules/admin/reservation/repository/reservation.repository';
import { DetailedRoom } from 'src/modules/admin/room/entities/room.entity';
import { RoomRepository } from 'src/modules/admin/room/repositories/room.repository';
import { BaseErrorHandler } from 'src/utils/error-handlers/service-error.handler';
import { errorDictionary } from './translation-dictionary';
import { getLimaTime } from 'src/utils/dates/peru-datetime';
import { CheckAvailableRoomsQueryDto } from './dto/landing-check-available-rooms.dto';
import { Translation } from '../i18n/translation';

@Injectable()
export class LandingReservationService {
  private readonly logger = new Logger(LandingReservationService.name);
  private readonly errorHandler: BaseErrorHandler;
  constructor(
    // private readonly reservationService: ReservationService,
    private readonly reservationRepository: ReservationRepository,
    private readonly roomRepository: RoomRepository,
    private readonly translation: Translation,
  ) {
    this.errorHandler = new BaseErrorHandler(
      this.logger,
      'Reservation',
      reservationErrorMessages,
    );
  }
  async checkAvailableRooms({
    checkInDate,
    checkOutDate,
    guestNumber,
    roomId,
    locale,
  }: CheckAvailableRoomsQueryDto): Promise<DetailedRoom[]> {
    // Implementación de la lógica para verificar la disponibilidad de habitaciones;
    try {
      // Parse string dates to Date objects
      const parsedCheckInDate = new Date(checkInDate);
      const parsedCheckOutDate = new Date(checkOutDate);

      // Asegurarnos que locale es válido o usar 'es' como predeterminado
      const validLocale = ['es', 'en'].includes(locale) ? locale : 'es';

      // Logger.log(
      //   `Check available rooms for checkInDate: ${checkInDate}, checkOutDate: ${checkOutDate}, guestNumber: ${guestNumber}, roomId: ${roomId}, locale: ${locale}`,
      //   LandingReservationService.name,
      // );

      // Logger.log(
      //   `Parsed checkInDate: ${parsedCheckInDate}, parsed checkOutDate: ${parsedCheckOutDate}`,
      //   LandingReservationService.name,
      // );

      // Validate date format
      // Validate dates are valid (not invalid format or non-existent dates)
      if (
        isNaN(parsedCheckInDate.getTime()) ||
        isNaN(parsedCheckOutDate.getTime())
      ) {
        throw new BadRequestException(
          this.translation.getTranslations(
            'reservation_InvalidDate',
            validLocale,
            errorDictionary,
          ),
        );
      }

      // Validate that check-in is before check-out
      if (parsedCheckInDate >= parsedCheckOutDate) {
        // Logger.log(
        //   `Check-in date ${parsedCheckInDate} is not before check-out date ${parsedCheckOutDate}`,
        //   LandingReservationService.name,
        // );
        throw new BadRequestException(
          this.translation.getTranslations(
            'reservationCheckinAfterCheckout',
            validLocale,
            errorDictionary,
          ),
        );
      }

      // Validate that check-in is not in the past
      const startOfToday = getLimaTime();
      startOfToday.setHours(0, 0, 0, 0); // Set to the start of today
      if (parsedCheckInDate < startOfToday) {
        throw new BadRequestException(
          this.translation.getTranslations(
            'reservation_DateInThePast',
            validLocale,
            errorDictionary,
          ),
        );
      }

      // Get all reserved room IDs for the given date range
      const reservedRoomIds =
        await this.reservationRepository.getReservedRoomsIds(
          parsedCheckInDate,
          parsedCheckOutDate,
        );
      // const availableRooms = await this.reservationService.getAllAvailableRooms(
      //   checkInDate,
      //   checkOutDate,
      //   false,
      // );
      // return availableRooms.filter((room) => room.id === roomId);

      // Find all available rooms (those not in the reserved list)
      const queryCondition: any = {
        isActive: true,
        id: {
          notIn: reservedRoomIds,
        },
        RoomTypes: {
          guests: {
            gte: guestNumber,
          },
        },
      };

      // If roomId is provided and it's not in the reserved list, filter by that specific room
      if (roomId && !reservedRoomIds.includes(roomId)) {
        queryCondition.id = {
          equals: roomId,
          notIn: reservedRoomIds,
        };
      }

      const availableRooms = await this.roomRepository.findMany<DetailedRoom>({
        where: queryCondition,
        include: { RoomTypes: true },
      });

      return availableRooms;

      // Aquí puedes agregar la lógica para filtrar las habitaciones según el número de huéspedes
    } catch (error) {
      Logger.error(error);
      this.errorHandler.handleError(error, 'getting');
    }
  }
}
