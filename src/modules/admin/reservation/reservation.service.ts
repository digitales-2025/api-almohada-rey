import { ReactivateReservationsUseCase } from './use-cases/reactivateReservations.use-case';
import { DeactivateReservationsUseCase } from './use-cases/deactivateReservations.use-case';
import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { BaseErrorHandler } from 'src/utils/error-handlers/service-error.handler';
import {
  DetailedReservation,
  Reservation,
} from './entities/reservation.entity';
import { BaseApiResponse } from 'src/utils/base-response/BaseApiResponse.dto';
import { reservationErrorMessages } from './errors/errors.reservation';
import { ReservationRepository } from './repository/reservation.repository';
import { CreateReservationUseCase } from './use-cases/createReservation.use-case';
import { UserData, UserPayload } from 'src/interfaces';
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
import { FilterQueryParamsByField } from 'src/utils/filter-params/flter-params';
import { ChangeReservationStatusUseCase } from './use-cases/changeReservationStatus.use.case';
import { ReservationStatus } from '@prisma/client';
import { ReservationStateFactory } from './states';
import { ReservationStatusAvailableActions } from './entities/reservation.status-actions';
import { UpdateManyDto, UpdateManyResponseDto } from './dto/update-many.dto';
import { ReservationGateway } from 'src/modules/websockets/reservation.gateway';
import { ApplyLateCheckoutUseCase } from './use-cases/applyLateCheckout.use.case';
import { ExtendStayUseCase } from './use-cases/extendStay.use.case';

@Injectable()
export class ReservationService {
  private readonly logger = new Logger(ReservationService.name);
  private readonly errorHandler: BaseErrorHandler;

  constructor(
    private readonly reservationRepository: ReservationRepository,
    private readonly createReservationUseCase: CreateReservationUseCase,
    private readonly updateReservationUseCase: UpdateReservationUseCase,
    private readonly roomRepository: RoomRepository,
    private readonly changeReservationStatusUseCase: ChangeReservationStatusUseCase,
    private readonly reservationStateFactory: ReservationStateFactory,
    private readonly deactivateReservationsUseCase: DeactivateReservationsUseCase,
    private readonly reactivateReservationsUseCase: ReactivateReservationsUseCase,
    private readonly applyLateCheckoutUseCase: ApplyLateCheckoutUseCase,
    private readonly extendStayUseCase: ExtendStayUseCase,
    @Inject(forwardRef(() => ReservationGateway))
    private readonly reservationGateway: ReservationGateway,
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
      // La verificación ahora se hace dentro de createReservationUseCase.execute
      // que ya la implementa dentro de una transacción con bloqueo pesimista
      const reservation = await this.createReservationUseCase.execute(
        createReservationDto,
        userData,
      );

      // Emitir evento de nueva reservación por WebSocket
      if (reservation.success && reservation.data) {
        // Obtén los detalles completos de la reserva para emitirlos
        const detailedReservation = await this.findOneDetailed(
          reservation.data.id,
        );
        if (detailedReservation) {
          this.reservationGateway.emitNewReservation(detailedReservation);

          // Notificar cambio en la disponibilidad de habitaciones
          this.reservationGateway.emitAvailabilityChange(
            createReservationDto.checkInDate,
            createReservationDto.checkOutDate,
          );
        }
      }
      return reservation;
    } catch (error) {
      return this.errorHandler.handleError(error, 'creating');
    }
  }

  async update(
    id: string,
    updateReservationDto: UpdateReservationDto,
    userData: UserData,
  ): Promise<BaseApiResponse<Reservation>> {
    try {
      // Mantener esta parte - Verificar si existe la reservación
      const originalReservation = await this.findOne(id);

      if (!originalReservation) {
        throw new BadRequestException(`No se encontró la reserva con ID ${id}`);
      }

      // Mantener esta parte - Mapear el DTO a la entidad
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

      // Mantener esta parte - Verificar si hay cambios
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

      // La verificación de disponibilidad ahora se hace dentro del caso de uso
      // con bloqueo pesimista para evitar condiciones de carrera
      const reservation = await this.updateReservationUseCase.execute(
        id,
        updatedReservation,
        userData,
      );

      // Emitir evento de actualización por WebSocket
      if (reservation.success && reservation.data) {
        // Obtén los detalles completos de la reserva para emitirlos
        const detailedReservation = await this.findOneDetailed(
          reservation.data.id,
        );
        if (detailedReservation) {
          this.reservationGateway.emitReservationUpdate(detailedReservation);

          // Si hubo cambio en las fechas, emitir cambio de disponibilidad
          if (
            updateReservationDto.checkInDate ||
            updateReservationDto.checkOutDate
          ) {
            this.reservationGateway.emitAvailabilityChange(
              updateReservationDto.checkInDate ||
                originalReservation.checkInDate,
              updateReservationDto.checkOutDate ||
                originalReservation.checkOutDate,
            );
          }
        }
      }

      return reservation;
    } catch (error) {
      return this.errorHandler.handleError(error, 'updating');
    }
  }

  deactivateReservations(
    dto: UpdateManyDto,
    userData: UserData,
  ): Promise<BaseApiResponse<UpdateManyResponseDto>> {
    try {
      const result = this.deactivateReservationsUseCase.execute(
        dto.ids,
        userData,
      );

      // Emitir eventos de eliminación para cada reservación desactivada
      result.then((response) => {
        if (response.success && dto.ids.length > 0) {
          dto.ids.forEach((id) => {
            this.reservationGateway.emitReservationDeleted(id);
          });
        }
      });

      return result;
    } catch (error) {
      this.errorHandler.handleError(error, 'deactivating');
    }
  }

  reactivateReservations(
    dto: UpdateManyDto,
    userData: UserData,
  ): Promise<BaseApiResponse<UpdateManyResponseDto>> {
    try {
      const result = this.reactivateReservationsUseCase.execute(
        dto.ids,
        userData,
      );

      // Emitir eventos de actualización para cada reservación reactivada
      result.then(async (response) => {
        if (response.success && dto.ids.length > 0) {
          for (const id of dto.ids) {
            const detailedReservation = await this.findOneDetailed(id);
            if (detailedReservation) {
              this.reservationGateway.emitReservationUpdate(
                detailedReservation,
              );
            }
          }
        }
      });

      return result;
    } catch (error) {
      this.errorHandler.handleError(error, 'reactivating');
    }
  }

  changeReservationStatus(
    id: string,
    newStatus: ReservationStatus,
    userData: UserData,
  ) {
    try {
      Logger.log(
        'Rquest received to change reservation status' +
          ' ' +
          id +
          ' ' +
          newStatus,
      );
      const reservation = this.changeReservationStatusUseCase.execute(
        id,
        newStatus,
        userData,
      );

      // Emitir evento de actualización por WebSocket
      reservation.then(async (result) => {
        if (result.success && result.data) {
          const detailedReservation = await this.findOneDetailed(id);
          if (detailedReservation) {
            this.reservationGateway.emitReservationUpdate(detailedReservation);
          }
        }
      });
      return reservation;
    } catch (error) {
      this.errorHandler.handleError(error, 'updating');
    }
  }

  async validateStatusTransitionActions(
    id: string,
  ): Promise<ReservationStatusAvailableActions> {
    try {
      const reservation = await this.findOne(id);
      if (!reservation) {
        throw new BadRequestException(`No se encontró la reserva con ID ${id}`);
      }
      return this.reservationStateFactory.getAvailableActions(
        reservation.status,
      );
    } catch (error) {
      this.errorHandler.handleError(error, 'getting');
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
    user: UserPayload,
    pagination?: PaginationParams,
    additionalParams?: FilterQueryParamsByField<Reservation>,
    // filter?: any,
  ): Promise<PaginatedResponse<DetailedReservation>> {
    try {
      let filter: any = {};
      if (!user.isSuperAdmin) {
        filter = { isActive: true };
      }

      // Extract date parameters if they exist
      let checkInDate: Date | undefined;
      let checkOutDate: Date | undefined;

      if (additionalParams?.checkInDate) {
        checkInDate = new Date(additionalParams.checkInDate as string);
        delete additionalParams.checkInDate; // Remove from additionalParams to avoid conflicts
      }

      if (additionalParams?.checkOutDate) {
        checkOutDate = new Date(additionalParams.checkOutDate as string);
        delete additionalParams.checkOutDate; // Remove from additionalParams to avoid conflicts
      }

      // Validate that check-in is before check-out if both dates are provided
      if (checkInDate && checkOutDate && checkInDate >= checkOutDate) {
        throw new BadRequestException(
          'La fecha de check-in debe ser anterior a la fecha de check-out',
        );
      }

      if (additionalParams) {
        filter = {
          ...filter,
          ...additionalParams,
        };
      }

      // Si solo hay fecha de entrada
      if (checkInDate && !checkOutDate) {
        filter = {
          ...filter,
          checkInDate: { gte: checkInDate },
        };
      }

      // Si solo hay fecha de salida
      if (!checkInDate && checkOutDate) {
        filter = {
          ...filter,
          checkOutDate: { lte: checkOutDate },
        };
      }

      // Add date range filter if both dates are provided
      if (checkInDate && checkOutDate) {
        filter.OR = [
          // Reservations that start during the requested period
          {
            checkInDate: {
              gte: checkInDate,
              lt: checkOutDate,
            },
          },
          // Reservations that end during the requested period
          {
            checkOutDate: {
              gt: checkInDate,
              lte: checkOutDate,
            },
          },
          // Reservations that span the entire requested period
          {
            AND: [
              { checkInDate: { lte: checkInDate } },
              { checkOutDate: { gte: checkOutDate } },
            ],
          },
        ];
      }

      return this.reservationRepository.findManyPaginated<DetailedReservation>(
        pagination,
        {
          where: filter,
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

      // NUEVO: Emitir evento de consulta de disponibilidad
      this.reservationGateway.emitRoomAvailabilityChecked(
        roomId,
        checkInDate,
        checkOutDate,
        isAvailable,
      );

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

      // Emitir las reservaciones encontradas para mantener sincronizados a los clientes
      this.reservationGateway.emitReservationsInInterval(
        checkInDate,
        checkOutDate,
        reservations,
      );

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

      let originalReservation: Reservation | null = null;
      let sameRoomTypeFilter = {}; // Inicializar filtro vacío por defecto

      if (forUpdate && reservationId) {
        Logger.log('Procesando actualización de reservación');
        // Buscar la reserva original
        originalReservation =
          await this.reservationRepository.findOne<Reservation>({
            where: {
              id: reservationId,
              isActive: true,
            },
            include: { room: true }, // Incluir la habitación para obtener su tipo
          });

        if (originalReservation) {
          // Excluir la habitación actual de las reservadas para permitir mantenerla
          reservedRoomIds = reservedRoomIds.filter(
            (id) => id !== originalReservation.roomId,
          );

          // Si la reserva está CONFIRMED, solo permitir habitaciones del mismo tipo
          if (originalReservation.status === ReservationStatus.CONFIRMED) {
            Logger.log(
              'Reservación CONFIRMED: filtrando por mismo tipo de habitación',
            );

            // Buscar la habitación original para obtener su tipo
            const originalRoom = await this.roomRepository.findById(
              originalReservation.roomId,
              {
                RoomTypes: true,
              },
            );

            if (originalRoom) {
              // Crear filtro para buscar solo habitaciones del mismo tipo
              sameRoomTypeFilter = {
                roomTypeId: originalRoom.roomTypeId,
              };

              Logger.log(
                `Filtrando por tipo de habitación: ${originalRoom.roomTypeId}`,
              );
            }
          }
        }
      }

      // Find all available rooms (those not in the reserved list)
      // Si la reserva está CONFIRMED, aplicamos el filtro adicional de roomTypeId
      const availableRooms = await this.roomRepository.findMany<DetailedRoom>({
        where: {
          isActive: true,
          id: {
            notIn: reservedRoomIds,
          },
          ...sameRoomTypeFilter, // Aplicar filtro de tipo de habitación si es necesario
        },
        include: { RoomTypes: true },
      });

      // Emitir evento de cambio de disponibilidad para mantener a los clientes actualizados
      this.reservationGateway.emitAvailabilityChange(checkInDate, checkOutDate);

      if (originalReservation?.status === ReservationStatus.CONFIRMED) {
        Logger.log(
          `Habitaciones disponibles del mismo tipo: ${availableRooms.length}`,
        );
      }

      return availableRooms;
    } catch (error) {
      this.errorHandler.handleError(error, 'getting');
    }
  }

  /**
   * Aplica Late Checkout a una reserva, extendiendo la hora de salida en el mismo día.
   * Valida que la habitación esté disponible y no haya otra reserva ese día.
   * @param reservationId ID de la reserva a modificar
   * @param newCheckoutTime Nueva hora de checkout (formato HH:mm)
   * @param userData Información del usuario que realiza la acción
   * @returns Reserva actualizada
   */
  async applyLateCheckout(
    reservationId: string,
    newCheckoutTime: string,
    userData: UserData,
  ): Promise<BaseApiResponse<Reservation>> {
    try {
      this.logger.log(
        `Solicitando aplicar late checkout a la reserva ${reservationId} con hora ${newCheckoutTime}`,
      );

      const result = await this.applyLateCheckoutUseCase.execute(
        reservationId,
        newCheckoutTime,
        userData,
      );

      // Si tuvo éxito, notificar a través de WebSockets
      if (result.success && result.data) {
        const detailedReservation = await this.findOneDetailed(result.data.id);

        if (detailedReservation) {
          this.reservationGateway.emitReservationUpdate(detailedReservation);
        }
      }

      return result;
    } catch (error) {
      this.logger.error(`Error al aplicar late checkout: ${error.message}`, {
        error,
        reservationId,
        newCheckoutTime,
      });
      return this.errorHandler.handleError(error, 'updating');
    }
  }

  /**
   * Extiende la estadía de una reserva, cambiando la fecha de checkout a una fecha posterior.
   * Valida que la habitación esté disponible para las nuevas fechas.
   * @param reservationId ID de la reserva a modificar
   * @param newCheckoutDate Nueva fecha de checkout en formato ISO
   * @param userData Información del usuario que realiza la acción
   * @returns Reserva actualizada
   */
  async extendStay(
    reservationId: string,
    newCheckoutDate: string,
    userData: UserData,
  ): Promise<BaseApiResponse<Reservation>> {
    try {
      this.logger.log(
        `Solicitando extender estadía de la reserva ${reservationId} hasta ${newCheckoutDate}`,
      );

      const result = await this.extendStayUseCase.execute(
        reservationId,
        newCheckoutDate,
        userData,
      );

      // Si tuvo éxito, notificar a través de WebSockets
      if (result.success && result.data) {
        const detailedReservation = await this.findOneDetailed(result.data.id);

        if (detailedReservation) {
          this.reservationGateway.emitReservationUpdate(detailedReservation);
        }
      }

      return result;
    } catch (error) {
      this.logger.error(`Error al extender estadía: ${error.message}`, {
        error,
        reservationId,
        newCheckoutDate,
      });
      return this.errorHandler.handleError(error, 'updating');
    }
  }
}
