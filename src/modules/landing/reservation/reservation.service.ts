import { Injectable, Logger } from '@nestjs/common';
import { reservationErrorMessages } from 'src/modules/admin/reservation/errors/errors.reservation';
// import { CreateReservationDto } from './dto/create-reservation.dto';
// import { UpdateReservationDto } from './dto/update-reservation.dto';
import { ReservationRepository } from 'src/modules/admin/reservation/repository/reservation.repository';
import { ReservationService } from 'src/modules/admin/reservation/reservation.service';
import { DetailedRoom } from 'src/modules/admin/room/entities/room.entity';
import { BaseErrorHandler } from 'src/utils/error-handlers/service-error.handler';

@Injectable()
export class LandingReservationService {
  private readonly logger = new Logger(ReservationService.name);
  private readonly errorHandler: BaseErrorHandler;
  constructor(
    private readonly reservationService: ReservationService,
    private readonly reservationRepository: ReservationRepository,
  ) {
    this.errorHandler = new BaseErrorHandler(
      this.logger,
      'Reservation',
      reservationErrorMessages,
    );
  }
  async checkAvilableRooms(
    checkInDate: string,
    checkOutDate: string,
    roomId: string,
    // guestNumber: number,
  ): Promise<DetailedRoom[]> {
    // Implementación de la lógica para verificar la disponibilidad de habitaciones;
    try {
      const availableRooms = await this.reservationService.getAllAvailableRooms(
        checkInDate,
        checkOutDate,
        false,
      );
      return availableRooms.filter((room) => room.id === roomId);

      // Aquí puedes agregar la lógica para filtrar las habitaciones según el número de huéspedes
    } catch (error) {
      this.errorHandler.handleError(error, 'getting');
    }
  }
}

/**
 * Obtiene todas las habitaciones disponibles para un rango de fechas específico
 * @param checkInDate - Fecha de check-in en formato ISO
 * @param checkOutDate - Fecha de check-out en formato ISO
 * @returns Lista de habitaciones disponibles
 */
//   async getAllAvailableRooms(
//     checkInDate: string,
//     checkOutDate: string,
//     forUpdate: boolean = false,
//     reservationId?: string,
//   ): Promise<DetailedRoom[]> {
//     try {
//       if (forUpdate && !reservationId) {
//         throw new BadRequestException(
//           'Para actualizar una reserva, se requiere el ID de la reserva que esta actualizando',
//         );
//       }
//       // Parse string dates to Date objects
//       const parsedCheckInDate = new Date(checkInDate);
//       const parsedCheckOutDate = new Date(checkOutDate);

//       // Validate date format
//       if (
//         isNaN(parsedCheckInDate.getTime()) ||
//         isNaN(parsedCheckOutDate.getTime())
//       ) {
//         throw new BadRequestException('Invalid date format');
//       }

//       // Validate that check-in is before check-out
//       if (parsedCheckInDate >= parsedCheckOutDate) {
//         throw new BadRequestException(
//           'La fecha de check-in debe ser anterior a la fecha de check-out',
//         );
//       }

//       // Get all reserved room IDs for the given date range
//       let reservedRoomIds =
//         await this.reservationRepository.getReservedRoomsIds(
//           parsedCheckInDate,
//           parsedCheckOutDate,
//         );

//       if (forUpdate && reservationId) {
//         Logger.log('Entrando a las ras reservaciones para update REservation');
//         // If we're updating a reservation, we need to exclude the current reservation
//         // from the list of reserved room IDs
//         const originalReservation =
//           await this.reservationRepository.findOne<Reservation>({
//             where: {
//               id: reservationId,
//               isActive: true,
//             },
//           });

//         if (originalReservation) {
//           reservedRoomIds = reservedRoomIds.filter(
//             (id) => id !== originalReservation.roomId,
//           );
//         }
//       }

//       // Find all available rooms (those not in the reserved list)
//       const availableRooms = await this.roomRepository.findMany<DetailedRoom>({
//         where: {
//           isActive: true,
//           id: {
//             notIn: reservedRoomIds,
//           },
//         },
//         include: { RoomTypes: true },
//       });

//       return availableRooms;
//     } catch (error) {
//       this.errorHandler.handleError(error, 'getting');
//     }
//   }
// }
