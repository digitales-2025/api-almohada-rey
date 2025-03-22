import { Injectable, Logger } from '@nestjs/common';
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
import { RoomsRepository } from '../admin/room-type/repositories/room-type.repository';
import { RoomStatus } from '../admin/room-type/dto';
import { PaginationParams } from 'src/utils/paginated-response/pagination.types';
import { PaginatedResponse } from 'src/utils/paginated-response/PaginatedResponse.dto';

@Injectable()
export class ReservationService {
  private readonly logger = new Logger(ReservationService.name);
  private readonly errorHandler: BaseErrorHandler;

  constructor(
    private readonly reservationRepository: ReservationRepository,
    private readonly createReservationUseCase: CreateReservationUseCase,
    private readonly roomsRepository: RoomsRepository,
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
      const room = await this.roomsRepository.findByStatus({
        status: RoomStatus.AVAILABLE,
        id: createReservationDto.roomId,
      });
      if (room.length == 0) {
        throw new Error('Habitación no disponible');
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
            room: true,
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
}
