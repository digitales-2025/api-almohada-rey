import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { reservationErrorMessages } from 'src/modules/admin/reservation/errors/errors.reservation';
// import { CreateReservationDto } from './dto/create-reservation.dto';
// import { UpdateReservationDto } from './dto/update-reservation.dto';
import { ReservationRepository } from 'src/modules/admin/reservation/repository/reservation.repository';
import { ReservationService } from 'src/modules/admin/reservation/reservation.service';
import { DetailedRoom } from 'src/modules/admin/room/entities/room.entity';
import { RoomRepository } from 'src/modules/admin/room/repositories/room.repository';
import { BaseErrorHandler } from 'src/utils/error-handlers/service-error.handler';
import { errorDictionary } from './translation-dictionary';
import { getLimaTime } from 'src/utils/dates/peru-datetime';

@Injectable()
export class LandingReservationService {
  private readonly logger = new Logger(ReservationService.name);
  private readonly errorHandler: BaseErrorHandler;
  constructor(
    // private readonly reservationService: ReservationService,
    private readonly reservationRepository: ReservationRepository,
    private readonly roomRepository: RoomRepository,
  ) {
    this.errorHandler = new BaseErrorHandler(
      this.logger,
      'Reservation',
      reservationErrorMessages,
    );
  }
  async checkAvilableRooms({
    checkInDate,
    checkOutDate,
    guestNumber,
    roomId,
  }: {
    checkInDate: string;
    checkOutDate: string;
    guestNumber: number;
    roomId?: string;
  }): Promise<DetailedRoom[]> {
    // Implementación de la lógica para verificar la disponibilidad de habitaciones;
    try {
      // Parse string dates to Date objects
      const parsedCheckInDate = new Date(checkInDate);
      const parsedCheckOutDate = new Date(checkOutDate);

      // Validate date format
      if (
        isNaN(parsedCheckInDate.getTime()) ||
        isNaN(parsedCheckOutDate.getTime())
      ) {
        throw new BadRequestException(
          errorDictionary['reservation.error.invalidDate'],
        );
      }

      // Validate that check-in is before check-out
      if (parsedCheckInDate >= parsedCheckOutDate) {
        throw new BadRequestException(
          errorDictionary['reservation.error.checkInAfterCheckOut'],
        );
      }

      // Validate that check-in is not in the past
      const startOfToday = getLimaTime();
      startOfToday.setHours(0, 0, 0, 0); // Set to the start of today
      if (parsedCheckInDate < startOfToday) {
        throw new BadRequestException(
          errorDictionary['reservation.error.dateInThePast'],
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
      this.errorHandler.handleError(error, 'getting');
    }
  }
}
