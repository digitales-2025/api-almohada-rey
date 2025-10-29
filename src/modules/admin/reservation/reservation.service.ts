import { ReactivateReservationsUseCase } from './use-cases/reactivateReservations.use-case';
import { DeactivateReservationsUseCase } from './use-cases/deactivateReservations.use-case';
import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { CreateLandingReservationDto } from 'src/modules/landing/reservation/dto/create-reservation.dto';
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
import {
  defaultLocale,
  SupportedLocales,
} from 'src/modules/landing/i18n/translations';
import { CreateReservationUseCaseForLanding } from './use-cases/createReservationForLanding.use-case';
import { ReservationGateway } from 'src/modules/websockets/reservation.gateway';
import { ApplyLateCheckoutUseCase } from './use-cases/applyLateCheckout.use.case';
import { ExtendStayUseCase } from './use-cases/extendStay.use.case';
import { LateCheckoutDto } from './dto/late-checkout.dto';
import { ExtendStayDto } from './dto/extend-stay.dto';
import { RemoveLateCheckoutUseCase } from './use-cases/removeLateCheckout.use.case';
import { ReasonResponseDto } from './dto/reasons-response.dto';
import {
  FilterOptions,
  SortOptions,
} from 'src/prisma/src/interfaces/base.repository.interfaces';

@Injectable()
export class ReservationService {
  private readonly logger = new Logger(ReservationService.name);
  private readonly errorHandler: BaseErrorHandler;

  constructor(
    private readonly reservationRepository: ReservationRepository,
    private readonly createReservationUseCase: CreateReservationUseCase,
    private readonly createReservationUseCaseForLanding: CreateReservationUseCaseForLanding,
    private readonly updateReservationUseCase: UpdateReservationUseCase,
    private readonly roomRepository: RoomRepository,
    private readonly changeReservationStatusUseCase: ChangeReservationStatusUseCase,
    private readonly reservationStateFactory: ReservationStateFactory,
    private readonly deactivateReservationsUseCase: DeactivateReservationsUseCase,
    private readonly reactivateReservationsUseCase: ReactivateReservationsUseCase,
    private readonly applyLateCheckoutUseCase: ApplyLateCheckoutUseCase,
    private readonly removeLateCheckoutUseCase: RemoveLateCheckoutUseCase,
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

  async createForLanding(
    createReservationDto: CreateLandingReservationDto,
    userData: UserData,
    locale: SupportedLocales = defaultLocale,
  ): Promise<BaseApiResponse<Reservation>> {
    try {
      const roomAvailability = await this.checkAvailability({
        roomId: createReservationDto.roomId,
        checkInDate: createReservationDto.checkInDate,
        checkOutDate: createReservationDto.checkOutDate,
      });

      if (!roomAvailability.isAvailable) {
        throw new BadRequestException(
          locale == defaultLocale
            ? 'Habitación no disponible'
            : 'Room not available',
        );
      }

      const reservation = await this.createReservationUseCaseForLanding.execute(
        createReservationDto,
        userData,
        locale,
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

  async deactivateReservations(
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

  async reactivateReservations(
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

  async changeReservationStatus(
    id: string,
    newStatus: ReservationStatus,
    userData: UserData,
  ) {
    try {
      const reservation = await this.changeReservationStatusUseCase.execute(
        id,
        newStatus,
        userData,
      );

      // Emitir evento de actualización por WebSocket
      if (reservation.success && reservation.data) {
        // Obtener la reservación detallada para emitir el evento
        const detailedReservation = await this.findOneDetailed(id);
        if (detailedReservation) {
          this.reservationGateway.emitReservationUpdate(detailedReservation);
        }

        // Si la reservación fue cancelada, emitir cambio de disponibilidad
        if (newStatus === ReservationStatus.CANCELED) {
          this.reservationGateway.emitAvailabilityChange(
            reservation.data.checkInDate,
            reservation.data.checkOutDate,
          );
        }
      }

      return reservation;
    } catch (error) {
      return this.errorHandler.handleError(error, 'updating');
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

  async findAll() {
    try {
      return this.reservationRepository.findMany();
    } catch (error) {
      this.errorHandler.handleError(error, 'getting');
    }
  }

  async findManyPaginated(
    user: UserPayload,
    pagination?: PaginationParams,
    additionalParams?: FilterQueryParamsByField<Reservation>,
    filterOptions?: FilterOptions<Reservation>,
    sortOptions?: SortOptions<Reservation>,
  ): Promise<PaginatedResponse<DetailedReservation>> {
    try {
      // Definir campos que son enums y fechas para el buildWhereClause
      const enumFields = ['status'];
      const dateFields = [
        'checkInDate',
        'checkOutDate',
        'createdAt',
        'updatedAt',
      ];

      // Filtros base para usuarios no super admin
      const baseFilters: FilterOptions<Reservation> = {};
      if (!user.isSuperAdmin) {
        baseFilters.searchByField = { isActive: true };
      }

      // Combinar filtros base con los proporcionados
      const combinedFilterOptions: FilterOptions<Reservation> = {
        ...baseFilters,
        ...filterOptions,
      };

      // Manejar filtros adicionales legacy (compatibilidad)
      const legacyParams = { ...additionalParams };

      // Extraer y procesar fechas legacy si existen
      let checkInDate: Date | undefined;
      let checkOutDate: Date | undefined;

      if (legacyParams?.checkInDate) {
        checkInDate = new Date(legacyParams.checkInDate as string);
        delete legacyParams.checkInDate;
      }

      if (legacyParams?.checkOutDate) {
        checkOutDate = new Date(legacyParams.checkOutDate as string);
        delete legacyParams.checkOutDate;
      }

      // Validar fechas si existen
      if (checkInDate && checkOutDate && checkInDate >= checkOutDate) {
        throw new BadRequestException(
          'La fecha de check-in debe ser anterior a la fecha de check-out',
        );
      }

      // Agregar filtros de fecha legacy al filterOptions si no están ya definidos
      if (checkInDate || checkOutDate) {
        if (!combinedFilterOptions.searchByField) {
          combinedFilterOptions.searchByField = {};
        }

        if (checkInDate && !checkOutDate) {
          combinedFilterOptions.fieldDate = {
            field: 'checkInDate',
            value: checkInDate.toISOString(),
            operator: 'gte',
          };
        } else if (!checkInDate && checkOutDate) {
          combinedFilterOptions.fieldDate = {
            field: 'checkOutDate',
            value: checkOutDate.toISOString(),
            operator: 'lte',
          };
        } else if (checkInDate && checkOutDate) {
          // Para rangos de fecha, usar el campo searchByField con un valor especial
          // que será manejado por lógica adicional en el repository
          combinedFilterOptions.searchByField!['dateRange'] =
            `${checkInDate.toISOString()} - ${checkOutDate.toISOString()}`;
        }
      }

      // Agregar otros parámetros legacy
      if (legacyParams && Object.keys(legacyParams).length > 0) {
        combinedFilterOptions.searchByField = {
          ...combinedFilterOptions.searchByField,
          ...legacyParams,
        };
      }

      const repositoryParams = {
        filterOptions: combinedFilterOptions,
        sortOptions,
        enumFields,
        dateFields,
        include: {
          room: {
            include: {
              RoomTypes: true,
            },
          },
          user: true,
          customer: true,
        },
      };

      // Usar el método avanzado del repository
      const result =
        await this.reservationRepository.findManyPaginated<DetailedReservation>(
          pagination,
          repositoryParams,
        );

      return result;
    } catch (error) {
      this.errorHandler.handleError(error, 'getting');
    }
  }

  async findOne(id: string) {
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

  async findOneDetailed(id: string) {
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

      // For updates, validate only when actually changing dates to the past
      if (parsedCheckInDate < now) {
        if (forUpdate && reservationId) {
          // For updates, only validate if we're actually changing the check-in date to the past
          const originalReservation = await this.reservationRepository.findOne({
            where: { id: reservationId, isActive: true },
          });

          if (originalReservation) {
            // Convert both dates to ISO strings for proper comparison
            const originalCheckInISO = new Date(
              originalReservation.checkInDate,
            ).toISOString();
            const newCheckInISO = new Date(checkInDate).toISOString();

            // Debug logs
            console.log('🔍 DEBUG - Date Comparison:');
            console.log(
              'Original checkInDate:',
              originalReservation.checkInDate,
            );
            console.log('Original ISO:', originalCheckInISO);
            console.log('New checkInDate:', checkInDate);
            console.log('New ISO:', newCheckInISO);
            console.log(
              'Are they equal?',
              originalCheckInISO === newCheckInISO,
            );

            // Only throw error if we're actually changing the date AND the new date is in the past
            if (originalCheckInISO !== newCheckInISO) {
              console.log('❌ Dates are different, throwing error');
              throw new BadRequestException(
                'La fecha de check-in nueva no puede estar en el pasado',
              );
            }
            console.log('✅ Dates are the same, allowing verification');
            // If dates are the same, allow it (even if it's in the past) - it's just verification
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
   * Verifica si es posible modificar la fecha/hora de checkout de una reserva sin generar conflictos.
   * Sirve tanto para Late Checkout como para extensión de estadía.
   *
   * @param reservationId ID de la reserva que se desea modificar
   * @param newCheckoutDate Nueva fecha y hora de checkout en formato ISO 8601
   * @returns Resultado de la verificación con información sobre conflictos
   */
  async checkExtendedCheckoutAvailability(
    reservationId: string,
    newCheckoutDate: string,
  ): Promise<{
    isAvailable: boolean;
  }> {
    try {
      this.logger.log(
        `Verificando disponibilidad para modificar checkout de la reserva ${reservationId} hasta ${newCheckoutDate}`,
      );

      // Obtener la reserva original
      const reservation =
        await this.reservationRepository.findOne<DetailedReservation>({
          where: {
            id: reservationId,
            isActive: true,
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

      if (!reservation) {
        throw new BadRequestException(
          `No se encontró la reserva con ID ${reservationId}`,
        );
      }

      // Convertir strings a objetos Date para comparación
      const originalCheckoutDate = new Date(reservation.checkOutDate);
      const parsedNewCheckoutDate = new Date(newCheckoutDate);

      // Validar que la nueva fecha es posterior a la original
      if (parsedNewCheckoutDate <= originalCheckoutDate) {
        throw new BadRequestException(
          'La nueva fecha/hora de checkout debe ser posterior a la original',
        );
      }

      // Validar que la nueva fecha es posterior a la fecha de check-in
      const originalCheckinDate = new Date(reservation.checkInDate);
      if (parsedNewCheckoutDate <= originalCheckinDate) {
        throw new BadRequestException(
          'La nueva fecha/hora de checkout debe ser posterior a la fecha de check-in',
        );
      }

      // Determinar si se trata de un late checkout (mismo día) o una extensión de estadía
      const isLateCheckout =
        parsedNewCheckoutDate.getFullYear() ===
          originalCheckoutDate.getFullYear() &&
        parsedNewCheckoutDate.getMonth() === originalCheckoutDate.getMonth() &&
        parsedNewCheckoutDate.getDate() === originalCheckoutDate.getDate();

      this.logger.log(
        `Tipo de modificación: ${isLateCheckout ? 'Late Checkout' : 'Extensión de estadía'}`,
      );

      // Definir la estructura de consulta para encontrar conflictos
      interface ConflictQueryParams {
        where: {
          id: { not: string };
          roomId: string;
          isActive: boolean;
          status: {
            in: ReservationStatus[];
          };
          OR: Array<
            | { checkInDate: { gte: Date; lt: Date } }
            | { checkOutDate: { gt: Date; lte: Date } }
            | {
                AND: Array<
                  | { checkInDate: { lte: Date } }
                  | { checkOutDate: { gte: Date } }
                >;
              }
          >;
        };
        include: {
          room: {
            include: {
              RoomTypes: boolean;
            };
          };
          customer: boolean;
          user: boolean;
        };
        orderBy: {
          checkInDate: 'asc' | 'desc';
        };
      }

      // Construir la consulta para buscar reservas conflictivas
      const conflictQuery: ConflictQueryParams = {
        where: {
          id: { not: reservationId },
          roomId: reservation.roomId,
          isActive: true,
          status: {
            in: [
              ReservationStatus.PENDING,
              ReservationStatus.CONFIRMED,
              ReservationStatus.CHECKED_IN,
            ],
          },
          OR: [
            // Caso 1: La fecha de check-in de otra reserva está dentro de nuestro nuevo período
            {
              checkInDate: {
                gte: originalCheckoutDate,
                lt: parsedNewCheckoutDate,
              },
            },
            // Caso 2: La fecha de check-out de otra reserva está dentro de nuestro nuevo período
            {
              checkOutDate: {
                gt: originalCheckoutDate,
                lte: parsedNewCheckoutDate,
              },
            },
            // Caso 3: Otra reserva abarca completamente nuestro nuevo período
            {
              AND: [
                { checkInDate: { lte: originalCheckoutDate } },
                { checkOutDate: { gte: parsedNewCheckoutDate } },
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
        orderBy: { checkInDate: 'asc' },
      };

      // Buscar reservas que puedan entrar en conflicto
      const conflictingReservations =
        await this.reservationRepository.findMany<DetailedReservation>(
          conflictQuery,
        );

      const isAvailable = conflictingReservations.length === 0;

      // Emitir la verificación para mantener sincronizados a los clientes
      this.reservationGateway.emitCheckoutAvailabilityChecked(
        reservation.roomId,
        reservation.checkOutDate,
        newCheckoutDate,
        isAvailable,
      );

      return {
        isAvailable,
      };
    } catch (error) {
      this.logger.error(`Error al verificar disponibilidad: ${error.message}`, {
        error,
      });
      throw error;
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
    lateCheckoutDto: LateCheckoutDto,
    userData: UserData,
  ): Promise<BaseApiResponse<Reservation>> {
    const { lateCheckoutTime } = lateCheckoutDto;
    try {
      const result = await this.applyLateCheckoutUseCase.execute(
        reservationId,
        lateCheckoutDto,
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
        lateCheckoutTime,
      });
      return this.errorHandler.handleError(error, 'updating');
    }
  }

  /**
   * Elimina un Late Checkout aplicado a una reserva, restaurando la hora original de salida
   * @param reservationId ID de la reserva a la que se eliminará el Late Checkout
   * @param userData Usuario que realiza la acción
   * @returns Reserva actualizada con la hora de checkout original
   */
  async removeLateCheckout(
    reservationId: string,
    userData: UserData,
  ): Promise<BaseApiResponse<Reservation>> {
    try {
      // Llamar al caso de uso de eliminación de Late Checkout
      const result = await this.removeLateCheckoutUseCase.execute(
        reservationId,
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
      this.logger.error(`Error al eliminar late checkout: ${error.message}`, {
        error,
        reservationId,
        userId: userData.id,
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
    extendStayDto: ExtendStayDto,
    userData: UserData,
  ): Promise<BaseApiResponse<Reservation>> {
    const { newCheckoutDate } = extendStayDto;
    try {
      const result = await this.extendStayUseCase.execute(
        reservationId,
        extendStayDto,
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

  /**
   * Obtiene todas las razones únicas de las reservas
   * @returns Lista de razones únicas ordenadas alfabéticamente
   */
  async getAllReasons(): Promise<ReasonResponseDto[]> {
    try {
      return await this.reservationRepository.getAllReasons();
    } catch (error) {
      this.logger.error(
        `Error al obtener razones de reservas: ${error.message}`,
        {
          error,
        },
      );
      throw error;
    }
  }
}
