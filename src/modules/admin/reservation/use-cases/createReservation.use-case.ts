import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ReservationRepository } from '../repository/reservation.repository';
import { CreateReservationDto } from '../dto/create-reservation.dto';
import { UserData } from 'src/interfaces';
import { AuditActionType, Prisma } from '@prisma/client';
import { BaseApiResponse } from 'src/utils/base-response/BaseApiResponse.dto';
import { GuestBuilder, Guests } from '../entities/guest.entity';
import { Reservation } from '../entities/reservation.entity';
import { AuditRepository } from 'src/modules/admin/audit/audit.repository';
// import { RoomRepository } from 'src/modules/admin/room/repositories/room.repository';

@Injectable()
export class CreateReservationUseCase {
  private readonly logger = new Logger(CreateReservationUseCase.name);
  constructor(
    private readonly reservationRepository: ReservationRepository,
    private readonly auditRepository: AuditRepository,
    // private readonly roomRepository: RoomRepository,
  ) {}

  async execute(
    createReservationDto: CreateReservationDto,
    user: UserData,
  ): Promise<BaseApiResponse<Reservation>> {
    try {
      const newReservation = await this.reservationRepository.transaction(
        async (tx) => {
          // 1. Construir los objetos huéspedes
          const guests = createReservationDto.guests.map((guest) => {
            return new GuestBuilder()
              .withName(guest.name)
              .withAge(guest?.age)
              .withDocumentType(guest?.documentType)
              .withDocumentId(guest?.documentId)
              .withPhone(guest?.phone)
              .withEmail(guest?.email)
              .withBirthDate(guest?.birthDate)
              .withAdditionalInfo(guest?.additionalInfo)
              .build();
          });

          // // 2. Actualizar estado de la habitación
          // await this.roomRepository.updateWithTx(
          //   createReservationDto.roomId,
          //   { status: 'RESERVED' },
          //   tx,
          // );

          // Logger.log('Ckeckin date ' + createReservationDto.checkInDate);
          // Logger.log('Checkout date ' + createReservationDto.checkOutDate);

          // 3. Crear reserva
          const reservation = await this.reservationRepository.createWithTx(
            {
              customerId: createReservationDto.customerId,
              roomId: createReservationDto.roomId,
              userId: user.id,
              reservationDate:
                createReservationDto.reservationDate ??
                new Date().toISOString(),
              checkInDate: new Date(
                createReservationDto.checkInDate,
              ).toISOString(),
              checkOutDate: new Date(
                createReservationDto.checkOutDate,
              ).toISOString(),
              origin: createReservationDto.origin,
              reason: createReservationDto.reason,
              status: createReservationDto.status,
              ...(createReservationDto.guests && {
                guests: new Guests(guests).stringify(),
              }),
              ...(createReservationDto.observations && {
                observations: createReservationDto.observations,
              }),
            },
            tx,
          );

          // 4. Registrar auditoría
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
        message: 'Reservación creada exitosamente',
        data: newReservation,
      };
    } catch (error) {
      // Manejo centralizado de errores
      this.logger.error(`Error al crear reservación: ${error.message}`, {
        error,
        dto: createReservationDto,
        userId: user.id,
      });

      // Transformar errores de Prisma en mensajes amigables
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        const userMessage = this.getPrismaErrorMessage(error);
        throw new BadRequestException(userMessage);
      }

      // Propagar errores ya tratados por NestJS
      if (error instanceof BadRequestException) {
        throw error;
      }

      // Errores inesperados
      throw new InternalServerErrorException(
        'Ocurrió un error al procesar la reservación. Por favor, intente nuevamente.',
      );
    }
  }

  /**
   * Convierte errores de Prisma en mensajes amigables para el usuario
   */
  private getPrismaErrorMessage(
    error: Prisma.PrismaClientKnownRequestError,
  ): string {
    // Interpretar códigos de error comunes de Prisma
    switch (error.code) {
      case 'P2002': // Unique constraint violation
        return `Ya existe una reservación con estos datos: ${error.meta?.target}`;
      case 'P2003': // Foreign key constraint violation
        return 'No se pudo crear la reservación porque alguno de los registros relacionados no existe';
      case 'P2025': // Record not found
        return 'No se encontró alguno de los registros necesarios para esta operación';
      default:
        return `Error al procesar la reservación: ${error.code}`;
    }
  }
}
