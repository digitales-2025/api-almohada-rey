import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ReservationRepository } from '../repository/reservation.repository';
import { UserData } from 'src/interfaces';
import { AuditActionType, Prisma, ReservationStatus } from '@prisma/client';
import { BaseApiResponse } from 'src/utils/base-response/BaseApiResponse.dto';
import { Reservation } from '../entities/reservation.entity';
import { AuditRepository } from 'src/modules/admin/audit/audit.repository';
import { CreateLandingReservationDto } from 'src/modules/landing/reservation/dto/create-reservation.dto';
import {
  defaultLocale,
  SupportedLocales,
} from 'src/modules/landing/i18n/translations';
// import { RoomRepository } from 'src/modules/admin/room/repositories/room.repository';

@Injectable()
export class CreateReservationUseCaseForLanding {
  private readonly logger = new Logger(CreateReservationUseCaseForLanding.name);
  constructor(
    private readonly reservationRepository: ReservationRepository,
    private readonly auditRepository: AuditRepository,
    // private readonly roomRepository: RoomRepository,
  ) {}

  async execute(
    createReservationDto: CreateLandingReservationDto,
    user: UserData,
    locale: SupportedLocales = defaultLocale,
  ): Promise<BaseApiResponse<Reservation>> {
    try {
      const newReservation = await this.reservationRepository.transaction(
        async (tx) => {
          //   // 1. Construir los objetos huéspedes
          //   const guests = createReservationDto.guests.map((guest) => {
          //     return new GuestBuilder()
          //       .withName(guest.name)
          //       .withAge(guest?.age)
          //       .withDocumentType(guest?.documentType)
          //       .withDocumentId(guest?.documentId)
          //       .withPhone(guest?.phone)
          //       .withEmail(guest?.email)
          //       .withBirthDate(guest?.birthDate)
          //       .withAdditionalInfo(guest?.additionalInfo)
          //       .build();
          //   });

          // Logger.log('Ckeckin date ' + createReservationDto.checkInDate);
          // Logger.log('Checkout date ' + createReservationDto.checkOutDate);

          // 2. Crear reserva
          const reservation = await this.reservationRepository.createWithTx(
            {
              //   customerId: createReservationDto.customerId,
              roomId: createReservationDto.roomId,
              userId: user.id,
              reservationDate: new Date().toISOString(),
              checkInDate: new Date(
                createReservationDto.checkInDate,
              ).toISOString(),
              checkOutDate: new Date(
                createReservationDto.checkOutDate,
              ).toISOString(),
              status: ReservationStatus.PENDING,
              createdByLandingPage: true,
              //   origin: createReservationDto.origin,
              //   reason: createReservationDto.reason,
              //   status: createReservationDto.status,
              //   ...(createReservationDto.guests && {
              //     guests: new Guests(guests).stringify(),
              //   }),
              //   ...(createReservationDto.observations && {
              //     observations: createReservationDto.observations,
              //   }),
            },
            tx,
          );

          // 3. Registrar auditoría
          await this.auditRepository.createWithTx(
            {
              entityId: reservation.id,
              entityType: 'reservation',
              action: AuditActionType.CREATE,
              performedById: user.id,
            },
            tx,
          );

          return reservation;
        },
      );

      return {
        success: true,
        message:
          locale === defaultLocale
            ? 'Reservación creada exitosamente'
            : 'Reservation created successfully',
        data: newReservation,
      };
    } catch (error) {
      //Manejo centralizado de errores
      this.logger.error(`Error al crear reservación: ${error.message}`, {
        error,
        dto: createReservationDto,
        userId: user.id,
      });

      // Transformar errores de Prisma en mensajes amigables
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        const userMessage = this.getPrismaErrorMessage(error, locale);
        throw new BadRequestException(userMessage);
      }

      // Propagar errores ya tratados por NestJS
      if (error instanceof BadRequestException) {
        throw error;
      }

      // Errores inesperados
      throw new InternalServerErrorException(
        locale === defaultLocale
          ? 'Ocurrió un error al procesar la reservación. Por favor, intente nuevamente.'
          : 'An error occurred while processing the reservation. Please try again later.',
      );
    }
  }

  /**
   * Convierte errores de Prisma en mensajes amigables para el usuario
   */
  private getPrismaErrorMessage(
    error: Prisma.PrismaClientKnownRequestError,
    locale: SupportedLocales = defaultLocale,
  ): string {
    // Mensajes en español e inglés según el locale
    const messages = {
      P2002: {
        es: `Ya existe una reservación con estos datos: ${error.meta?.target}`,
        en: `A reservation with these details already exists: ${error.meta?.target}`,
      },
      P2003: {
        es: 'No se pudo crear la reservación porque alguno de los registros relacionados no existe',
        en: 'Could not create the reservation because a related record does not exist',
      },
      P2025: {
        es: 'No se encontró alguno de los registros necesarios para esta operación',
        en: 'One or more required records for this operation were not found',
      },
      default: {
        es: `Error al procesar la reservación: ${error.code}`,
        en: `Error processing the reservation: ${error.code}`,
      },
    };

    const lang = locale === 'en' ? 'en' : 'es';
    const msg =
      messages[error.code as keyof typeof messages] || messages.default;
    return msg[lang];
  }
}
