import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { reservationErrorMessages } from 'src/modules/admin/reservation/errors/errors.reservation';
import { ReservationRepository } from 'src/modules/admin/reservation/repository/reservation.repository';
import { DetailedRoom } from 'src/modules/admin/room/entities/room.entity';
import { RoomRepository } from 'src/modules/admin/room/repositories/room.repository';
import { BaseErrorHandler } from 'src/utils/error-handlers/service-error.handler';
import { errorDictionary } from './translation-dictionary';
import { CheckAvailableRoomsQueryDto } from './dto/landing-check-available-rooms.dto';
import { Translation } from '../i18n/translation';
import { ReservationService } from 'src/modules/admin/reservation/reservation.service';
import { ReservationStatus } from '@prisma/client';
import { UsersService } from 'src/modules/admin/users/users.service';
import { defaultLocale, SupportedLocales } from '../i18n/translations';
import { CreateLandingReservationDto } from './dto/create-reservation.dto';
import { ConfirmBookingDto } from './dto/confirm-reservation.dto';
import { ConfirmPaymentLandingUseCase } from 'src/modules/admin/reservation/use-cases/confirm-payment-landing.use-case';
import { BaseApiResponse } from 'src/utils/base-response/BaseApiResponse.dto';
import { Reservation } from 'src/modules/admin/reservation/entities/reservation.entity';
import { TypedEventEmitter } from 'src/event-emitter/typed-event-emitter.class';
import { getCurrentLimaTime } from 'src/utils/dates/peru-datetime';

@Injectable()
export class LandingReservationService {
  private readonly logger = new Logger(LandingReservationService.name);
  private readonly errorHandler: BaseErrorHandler;
  constructor(
    // private readonly reservationService: ReservationService,
    private readonly reservationRepository: ReservationRepository,
    private readonly roomRepository: RoomRepository,
    private readonly translation: Translation,
    private readonly reservationService: ReservationService,
    private readonly userService: UsersService,
    private readonly confirmUseCase: ConfirmPaymentLandingUseCase,
    private readonly eventEmitter: TypedEventEmitter,
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
      const startOfToday = getCurrentLimaTime();
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

  // async findReservationById(
  //   reservationId: string,
  //   externalRequest: boolean = false,
  //   locale: SupportedLocales = 'es',
  // ) {
  //   try {
  //     const reservation = await this.reservationService.findOne(reservationId);
  //     if (!reservation) {
  //       throw new BadRequestException(
  //         this.translation.getTranslations(
  //           'reservationNotFound',
  //           locale,
  //           errorDictionary,
  //         ),
  //       );
  //     }
  //     return reservation;
  //   } catch (error) {
  //     Logger.error(error);
  //     if (externalRequest) this.errorHandler.handleError(error, 'getting');
  //     return undefined;
  //   }
  // }

  async checkReservationExists(
    reservationId: string,
    externalRequest: boolean = false,
  ) {
    try {
      const reservation = await this.reservationRepository.findUnique({
        where: { id: reservationId },
      });
      if (!reservation) {
        throw new BadRequestException(
          this.translation.getTranslations(
            'reservationNotFound',
            'es',
            errorDictionary,
          ),
        );
      }
      return reservation;
    } catch (error) {
      Logger.error(error);
      if (externalRequest) this.errorHandler.handleError(error, 'getting');
      return undefined;
    }
  }

  async CheckDetailedReservationExists(
    reservationId: string,
    externalRequest: boolean = false,
  ) {
    try {
      const reservation =
        await this.reservationService.findOneDetailed(reservationId);
      if (!reservation) {
        throw new BadRequestException(
          this.translation.getTranslations(
            'reservationNotFound',
            'es',
            errorDictionary,
          ),
        );
      }
      return reservation;
    } catch (error) {
      Logger.error(error);
      if (externalRequest) this.errorHandler.handleError(error, 'getting');
      return undefined;
    }
  }

  async createLandingReservation(
    dto: CreateLandingReservationDto,
    locale: SupportedLocales = defaultLocale,
  ) {
    try {
      const landingUser = await this.userService.findLandingUser();
      return await this.reservationService.createForLanding(
        dto,
        landingUser,
        locale,
      );
    } catch (error) {
      this.errorHandler.handleError(error, 'creating');
    }
  }

  async cancelReservation(id: string, locale?: SupportedLocales) {
    try {
      // Luego eliminar la reserva
      const deletedReservation = await this.reservationRepository.delete(id);

      // Asegurarse de que el objeto devuelto tenga el estado CANCELED para la validación
      const enhancedDeletedReservation = {
        ...deletedReservation,
        status: ReservationStatus.CANCELED, // Asegurar que tenga este estado para la validación
      };

      return {
        success: true,
        data: enhancedDeletedReservation,
        message: this.translation.getTranslations(
          'reservation_CancellationSuccess',
          locale,
          errorDictionary,
        ),
      };
    } catch {
      // Si hay error, devuelve un objeto con success en false
      return {
        success: false,
        message: this.translation.getTranslations(
          'reservation_CancellationException',
          locale,
          errorDictionary,
        ),
      };
    }
  }

  async confirmReservation(id: string, locale?: SupportedLocales) {
    try {
      const landingUser = await this.userService.findLandingUser();

      return await this.reservationService.changeReservationStatus(
        id,
        ReservationStatus.CONFIRMED,
        landingUser,
      );
    } catch {
      throw new Error(
        this.translation.getTranslations(
          'reservation_confirmationException',
          locale,
          errorDictionary,
        ),
      );
    }
  }

  async confirmReservationForController(
    id: string,
    locale: SupportedLocales = defaultLocale,
    dto: ConfirmBookingDto,
  ): Promise<BaseApiResponse<Reservation>> {
    try {
      const landingUser = await this.userService.findLandingUser();
      const updatedReservation = await this.confirmUseCase.execute(
        id,
        dto,
        landingUser,
      );

      // Obtener datos detallados de la reserva para el email
      const detailedReservation =
        await this.reservationService.findOneDetailed(id);

      if (detailedReservation) {
        // Enviar email de confirmación
        try {
          const emailResponse = await this.eventEmitter.emitAsync(
            'reservation.confirmation',
            {
              guestName: detailedReservation.customer.name,
              guestEmail: detailedReservation.customer.email,
              reservationId: detailedReservation.id,
              roomName: `Habitación ${detailedReservation.room.number}`,
              roomType:
                detailedReservation.room.RoomTypes?.name || 'Habitación',
              checkInDate: new Date(
                detailedReservation.checkInDate,
              ).toLocaleDateString('es-PE', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              }),
              checkOutDate: new Date(
                detailedReservation.checkOutDate,
              ).toLocaleDateString('es-PE', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              }),
              guestNumber: detailedReservation.requestedGuestNumber || 1,
              specialRequests: detailedReservation.observations || '',
            },
          );

          if (emailResponse.every((response) => response !== true)) {
            this.logger.warn(
              'Failed to send confirmation email for reservation:',
              id,
            );
          } else {
            this.logger.log(
              'Confirmation email sent successfully for reservation:',
              id,
            );
          }
        } catch (emailError) {
          this.logger.error('Error sending confirmation email:', emailError);
          // No lanzamos error para no afectar el flujo principal
        }
      }

      return {
        data: updatedReservation.data,
        message:
          locale === defaultLocale
            ? 'Datos de la reservación guardados exitosamente'
            : 'Reservation data saved successfully',
        success: true,
      };
    } catch {
      throw new BadRequestException(
        locale === defaultLocale
          ? 'Lo sentimos, no se pudieron guardar los datos de la reserva. Intente nuevamente.'
          : 'Sorry, we could not save the reservation data. Please try again.',
      );
    }
  }
}
