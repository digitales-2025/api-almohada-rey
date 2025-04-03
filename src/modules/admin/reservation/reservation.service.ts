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
import { hasNoChanges } from 'src/utils/update-validations.util';
import { UpdateReservationUseCase } from './use-cases/updateReservation.use-case';
import { UpdateReservationDto } from './dto/update-reservation.dto';

@Injectable()
export class ReservationService {
  private readonly logger = new Logger(ReservationService.name);
  private readonly errorHandler: BaseErrorHandler;

  constructor(
    private readonly reservationRepository: ReservationRepository,
    private readonly createReservationUseCase: CreateReservationUseCase,
    private readonly updateReservationUseCase: UpdateReservationUseCase,
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

  async update(
    id: string,
    updateReservationDto: UpdateReservationDto,
    userData: UserData,
  ): Promise<BaseApiResponse<Reservation>> {
    try {
      // const roomAvailability = await this.checkAvailability({
      //   roomId: createReservationDto.roomId,
      //   checkInDate: createReservationDto.checkInDate,
      //   checkOutDate: createReservationDto.checkOutDate,
      // });
      // if (!roomAvailability.isAvailable) {
      //   throw new BadRequestException('Habitación no disponible');
      // }
      // return this.reservationRepository.up(ids, updateReservationDto);

      const originalReservation = await this.findOne(id);

      if (!originalReservation) {
        throw new BadRequestException(`No se encontró la reserva con ID ${id}`);
      }

      const updatedReservation: Reservation = {
        customerId: updateReservationDto.customerId,
        roomId: updateReservationDto.roomId,
        userId: updateReservationDto.userId,
        reservationDate: updateReservationDto.reservationDate,
        checkInDate: updateReservationDto.checkInDate,
        checkOutDate: updateReservationDto.checkOutDate,
        origin: updateReservationDto.origin,
        reason: updateReservationDto.reason,
        status: updateReservationDto.status,
        guests: JSON.stringify(updateReservationDto.guests),
        observations: updateReservationDto.observations,
      };

      const dtoHasNoChanges = hasNoChanges(
        updatedReservation,
        originalReservation,
      );

      if (dtoHasNoChanges) {
        return {
          data: originalReservation,
          message: 'No se realizaron cambios en la reserva',
          success: true,
        };
      }

      // Logger.log(`Updated Reservation: ${JSON.stringify(updatedReservation)}`);

      //check chekin-out collisions
      const checkInDate = new Date(updatedReservation.checkInDate);
      const checkOutDate = new Date(updatedReservation.checkOutDate);

      // Logger.log(
      //   `CheckIn: ${checkInDate.toISOString()} - CheckOut: ${checkOutDate.toISOString()}`,
      // );

      const reservations = await this.getAllReservationsInTimeInterval(
        checkInDate.toISOString(),
        checkOutDate.toISOString(),
        true,
        id,
      );

      if (reservations.some((reservation) => reservation.id !== id)) {
        throw new BadRequestException(
          'La habitación no está disponible en las fechas seleccionadas',
        );
      }

      const reservation = await this.updateReservationUseCase.execute(
        id,
        updatedReservation,
        userData,
      );

      return reservation;
    } catch (error) {
      this.errorHandler.handleError(error, 'updating');
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

  findOne(id: string) {
    try {
      return this.reservationRepository.findOne<Reservation>({
        where: {
          id,
          isActive: true,
        },
      });
    } catch (error) {
      this.errorHandler.handleError(error, 'getting');
    }
  }

  findOneDetailed(id: string) {
    try {
      return this.reservationRepository.findOne<DetailedReservation>({
        where: {
          id,
          isActive: true,
        },
        include: {
          room: {
            include: {
              RoomTypes: true,
            },
          },
          user: true,
          customer: true,
        },
      });
    } catch (error) {
      this.errorHandler.handleError(error, 'getting');
    }
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
    forUpdate: boolean = false,
    reservationId?: string,
  ): Promise<RoomAvailabilityDto> {
    try {
      if (forUpdate && !reservationId) {
        throw new BadRequestException(
          'Para actualizar una reserva, se requiere el ID de la reserva que esta actualizando',
        );
      }
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
      // if (parsedCheckInDate < now) {
      //   throw new BadRequestException(
      //     'La fecha de check-in no puede estar en el pasado',
      //   );
      // }

      // For updates, validate only new check-in dates to allow historical data updates
      if (parsedCheckInDate < now) {
        // If it's an update, only validate if the date is being changed
        if (forUpdate && reservationId) {
          const originalReservation = await this.reservationRepository.findOne({
            where: { id: reservationId, isActive: true },
          });

          // Only validate if check-in date is being changed to a new date
          if (
            originalReservation &&
            originalReservation.checkInDate !== checkInDate
          ) {
            throw new BadRequestException(
              'La fecha de check-in nueva no puede estar en el pasado',
            );
          }
        } else {
          // For new reservations, always validate
          throw new BadRequestException(
            'La fecha de check-in no puede estar en el pasado',
          );
        }
      }

      // Verificar si la habitación existe
      const room = await this.roomRepository.findOne<DetailedRoom>({
        where: {
          id: roomId,
          isActive: true,
        },
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
          forUpdate,
          reservationId,
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
    forUpdate: boolean = false,
    reservationId?: string,
  ): Promise<DetailedReservation[]> {
    try {
      if (forUpdate && !reservationId) {
        throw new BadRequestException(
          'Para actualizar una reserva, se requiere el ID de la reserva que esta actualizando',
        );
      }
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

      // let originalReservation: DetailedReservation | undefined;

      // If we're doing an update, we'll need to exclude the current reservation
      // from the collision check, as it should be allowed to occupy its own time slot
      const where: any = {
        isActive: true,
        OR: [
          // Reservations that start during the requested period
          {
            checkInDate: {
              gte: parsedCheckInDate,
              lt: parsedCheckOutDate,
            },
          },
          // Reservations that end during the requested period
          {
            checkOutDate: {
              gt: parsedCheckInDate,
              lte: parsedCheckOutDate,
            },
          },
          // Reservations that span the entire requested period
          {
            AND: [
              { checkInDate: { lte: parsedCheckInDate } },
              { checkOutDate: { gte: parsedCheckOutDate } },
            ],
          },
        ],
      };

      // For updates, exclude the reservation being updated from the collision check
      if (forUpdate && reservationId) {
        where.id = { not: reservationId };
        // originalReservation =
        //   await this.reservationRepository.findOne<DetailedReservation>({
        //     where: {
        //       id: reservationId,
        //       isActive: true,
        //     },
        //     include: {
        //       room: {
        //         include: {
        //           RoomTypes: true,
        //         },
        //       },
        //       customer: true,
        //       user: true,
        //     },
        //   });
      }

      const reservations =
        await this.reservationRepository.findMany<DetailedReservation>({
          where: where,
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

      // if (forUpdate && reservationId && originalReservation) {
      //   reservations.push(originalReservation);
      // }

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
    forUpdate: boolean = false,
    reservationId?: string,
  ): Promise<DetailedRoom[]> {
    try {
      if (forUpdate && !reservationId) {
        throw new BadRequestException(
          'Para actualizar una reserva, se requiere el ID de la reserva que esta actualizando',
        );
      }
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
      let reservedRoomIds =
        await this.reservationRepository.getReservedRoomsIds(
          parsedCheckInDate,
          parsedCheckOutDate,
        );

      if (forUpdate && reservationId) {
        Logger.log('Entrando a las ras reservaciones para update REservation');
        // If we're updating a reservation, we need to exclude the current reservation
        // from the list of reserved room IDs
        const originalReservation =
          await this.reservationRepository.findOne<Reservation>({
            where: {
              id: reservationId,
              isActive: true,
            },
          });

        if (originalReservation) {
          reservedRoomIds = reservedRoomIds.filter(
            (id) => id !== originalReservation.roomId,
          );
        }
      }

      // Find all available rooms (those not in the reserved list)
      const availableRooms = await this.roomRepository.findMany<DetailedRoom>({
        where: {
          isActive: true,
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
