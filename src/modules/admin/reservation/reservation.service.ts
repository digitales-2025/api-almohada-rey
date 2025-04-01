import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { CreateReservationDto } from './dto/create-reservation.dto';
// import { UpdateReservationDto } from './dto/update-reservation.dto';
import { BaseErrorHandler } from 'src/utils/error-handlers/service-error.handler';
import {
  DetailedReservation,
  Reservation,
} from './entities/reservation.entity';
import { BaseApiResponse } from 'src/utils/base-response/BaseApiResponse.dto';
import { reservationErrorMessages } from './errors/errors.reservation';
import { ReservationRepository } from './repository/reservation.repository';
import { CreateReservationUseCase } from './use-cases/createReservation.use-case';
import { UserData } from 'src/interfaces';
import { PaginationParams } from 'src/utils/paginated-response/pagination.types';
import { PaginatedResponse } from 'src/utils/paginated-response/PaginatedResponse.dto';
import { RoomRepository } from '../room/repositories/room.repository';
import {
  CheckAvailabilityDto,
  RoomAvailabilityDto,
} from './dto/room-availability.dto';
import { DetailedRoom } from '../room/entities/room.entity';

@Injectable()
export class ReservationService {
  private readonly logger = new Logger(ReservationService.name);
  private readonly errorHandler: BaseErrorHandler;

  constructor(
    private readonly reservationRepository: ReservationRepository,
    private readonly createReservationUseCase: CreateReservationUseCase,
    private readonly roomRepository: RoomRepository,
  ) {
    this.errorHandler = new BaseErrorHandler(
      this.logger,
      'Reservation',
      reservationErrorMessages,
    );
  }

  async create(
    createReservationDto: CreateReservationDto,
    userData: UserData,
  ): Promise<BaseApiResponse<Reservation>> {
    try {
      // const room

      // const room = await this.roomRepository.findByStatus({
      //   status: RoomStatus.AVAILABLE,
      //   id: createReservationDto.roomId,
      // });
      const roomAvailability = await this.checkAvailability({
        roomId: createReservationDto.roomId,
        checkInDate: createReservationDto.checkInDate,
        checkOutDate: createReservationDto.checkOutDate,
      });

      // if (room.length == 0) {
      //   throw new BadRequestException('Habitación no disponible');
      // }

      if (!roomAvailability.isAvailable) {
        throw new BadRequestException('Habitación no disponible');
      }

      const reservation = this.createReservationUseCase.execute(
        createReservationDto,
        userData,
      );
      return reservation;
    } catch (error) {
      this.errorHandler.handleError(error, 'creating');
    }
  }

  findAll() {
    try {
      return this.reservationRepository.findMany();
    } catch (error) {
      this.errorHandler.handleError(error, 'getting');
    }
  }

  //In the future some filters may be applied
  findManyPaginated(
    pagination?: PaginationParams,
    // filter?: any,
  ): Promise<PaginatedResponse<DetailedReservation>> {
    try {
      return this.reservationRepository.findManyPaginated<DetailedReservation>(
        pagination,
        {
          include: {
            room: {
              include: {
                RoomTypes: true,
              },
            },
            user: true,
            customer: true,
          },
        },
      );
    } catch (error) {
      this.errorHandler.handleError(error, 'getting');
    }
  }

  findOne(id: number) {
    return `This action returns a #${id} reservation`;
  }

  update(
    id: number,
    // updateReservationDto: UpdateReservationDto
  ) {
    return `This action updates a #${id} reservation`;
  }

  remove(id: number) {
    return `This action removes a #${id} reservation`;
  }

  /**
   * Verifica la disponibilidad de una habitación para un rango de fechas específico
   * @param checkAvailabilityDto - Datos para verificar disponibilidad
   * @returns Objeto con información de disponibilidad
   */
  async checkAvailability(
    checkAvailabilityDto: CheckAvailabilityDto,
  ): Promise<RoomAvailabilityDto> {
    try {
      const { roomId, checkInDate, checkOutDate } = checkAvailabilityDto;

      // Validar que las fechas son correctas
      const parsedCheckInDate = new Date(checkInDate);
      const parsedCheckOutDate = new Date(checkOutDate);

      // Validar que check-in es anterior a check-out
      if (parsedCheckInDate >= parsedCheckOutDate) {
        throw new BadRequestException(
          'La fecha de check-in debe ser anterior a la fecha de check-out',
        );
      }

      // Look Out this
      // Validar que no estamos en el pasado
      const now = new Date();
      if (parsedCheckInDate < now) {
        throw new BadRequestException(
          'La fecha de check-in no puede estar en el pasado',
        );
      }

      // Verificar si la habitación existe
      const room = await this.roomRepository.findOne<DetailedRoom>({
        where: { id: roomId },
        include: { RoomTypes: true },
      });
      if (!room) {
        throw new BadRequestException(
          `Habitación con ID ${roomId} no encontrada`,
        );
      }

      // Verificar disponibilidad en las fechas solicitadas
      const isAvailable =
        await this.reservationRepository.checkRoomAvailability(
          roomId,
          parsedCheckInDate,
          parsedCheckOutDate,
        );

      // Crear la respuesta
      const response: RoomAvailabilityDto = {
        roomId,
        checkInDate,
        checkOutDate,
        isAvailable,
      };

      // Si está disponible, agregar información adicional de la habitación
      if (isAvailable) {
        response.roomNumber = room.number.toString();
        response.roomPrice = room.RoomTypes.price;
        // response.roomTypeName = room.RoomTypes.name;
      }

      return response;
    } catch (error) {
      this.errorHandler.handleError(error, 'getting');
    }
  }

  /**
   * Obtiene todas las reservas que se solapan con un rango de fechas específico
   * @param checkInDate - Fecha de inicio en formato ISO
   * @param checkOutDate - Fecha de fin en formato ISO
   * @returns Lista de reservas en el intervalo de tiempo
   */
  async getAllReservationsInTimeInterval(
    checkInDate: string,
    checkOutDate: string,
  ): Promise<DetailedReservation[]> {
    try {
      // Parse string dates to Date objects
      const parsedCheckInDate = new Date(checkInDate);
      const parsedCheckOutDate = new Date(checkOutDate);

      // Validate date format
      if (
        isNaN(parsedCheckInDate.getTime()) ||
        isNaN(parsedCheckOutDate.getTime())
      ) {
        throw new BadRequestException('Invalid date format');
      }

      // Validate that check-in is before check-out
      if (parsedCheckInDate >= parsedCheckOutDate) {
        throw new BadRequestException(
          'La fecha de check-in debe ser anterior a la fecha de check-out',
        );
      }

      const reservations =
        await this.reservationRepository.findMany<DetailedReservation>({
          where: {
            OR: [
              // Reservas que comienzan durante el período solicitado
              {
                checkInDate: {
                  gte: parsedCheckInDate,
                  lt: parsedCheckOutDate,
                },
              },
              // Reservas que terminan durante el período solicitado
              {
                checkOutDate: {
                  gt: parsedCheckInDate,
                  lte: parsedCheckOutDate,
                },
              },
              // Reservas que abarcan todo el período solicitado
              {
                AND: [
                  { checkInDate: { lte: parsedCheckInDate } },
                  { checkOutDate: { gte: parsedCheckOutDate } },
                ],
              },
            ],
          },
          include: {
            room: {
              include: {
                RoomTypes: true,
              },
            },
            customer: true,
            user: true,
          },
        });
      return reservations;
    } catch (error) {
      this.errorHandler.handleError(error, 'getting');
    }
  }

  /**
   * Obtiene todas las habitaciones disponibles para un rango de fechas específico
   * @param checkInDate - Fecha de check-in en formato ISO
   * @param checkOutDate - Fecha de check-out en formato ISO
   * @returns Lista de habitaciones disponibles
   */
  async getAllAvailableRooms(
    checkInDate: string,
    checkOutDate: string,
  ): Promise<DetailedRoom[]> {
    try {
      // Parse string dates to Date objects
      const parsedCheckInDate = new Date(checkInDate);
      const parsedCheckOutDate = new Date(checkOutDate);

      // Validate date format
      if (
        isNaN(parsedCheckInDate.getTime()) ||
        isNaN(parsedCheckOutDate.getTime())
      ) {
        throw new BadRequestException('Invalid date format');
      }

      // Validate that check-in is before check-out
      if (parsedCheckInDate >= parsedCheckOutDate) {
        throw new BadRequestException(
          'La fecha de check-in debe ser anterior a la fecha de check-out',
        );
      }

      // Get all reserved room IDs for the given date range
      const reservedRoomIds =
        await this.reservationRepository.getReservedRoomsIds(
          parsedCheckInDate,
          parsedCheckOutDate,
        );

      // Find all available rooms (those not in the reserved list)
      const availableRooms = await this.roomRepository.findMany<DetailedRoom>({
        where: {
          id: {
            notIn: reservedRoomIds,
          },
        },
        include: { RoomTypes: true },
      });

      return availableRooms;
    } catch (error) {
      this.errorHandler.handleError(error, 'getting');
    }
  }

  //   /**
  //    * Obtiene todas las habitaciones disponibles para un rango de fechas específico
  //    * @param checkInDate - Fecha de check-in en formato ISO
  //    * @param checkOutDate - Fecha de check-out en formato ISO
  //    * @returns Lista de habitaciones disponibles
  //    */
  //   async getAllAvailableRooms(
  //     checkInDate: string,
  //     checkOutDate: string,
  //   ): Promise<DetailedRoom[]> {
  //     try {
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

  //       const availableRooms = await this.roomRepository.findMany({
  //         where: {
  //           id: {
  //             notIn: await this.reservationRepository.getReservedRoomIds(
  //               parsedCheckInDate,
  //               parsedCheckOutDate,
  //             ),
  //           },
  //         },
  //         include: { RoomTypes: true },
  //       });

  //       return availableRooms;
  //     } catch (error) {
  //       this.errorHandler.handleError(error, 'getting');
  //     }
}
