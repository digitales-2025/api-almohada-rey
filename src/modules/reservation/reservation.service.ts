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
import { RoomRepository } from '../admin/room/repositories/room.repository';
import { RoomStatus } from '@prisma/client';

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
      const room = await this.roomRepository.findByStatus({
        status: RoomStatus.AVAILABLE,
        id: createReservationDto.roomId,
      });
      if (room.length == 0) {
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
