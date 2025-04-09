import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ReservationRepository } from '../repository/reservation.repository';
import { UserData } from 'src/interfaces';
import { AuditActionType, Prisma } from '@prisma/client';
import { BaseApiResponse } from 'src/utils/base-response/BaseApiResponse.dto';
import { AuditRepository } from 'src/modules/admin/audit/audit.repository';
import { ReservationStateFactory } from '../states/reservation-state.factory';
import { UpdateManyResponseDto } from '../dto/update-many.dto';
import { getCurrentLimaDate } from 'src/utils/dates/peru-datetime';

@Injectable()
export class ReactivateReservationsUseCase {
  private readonly logger = new Logger(ReactivateReservationsUseCase.name);
  constructor(
    private readonly reservationRepository: ReservationRepository,
    private readonly auditRepository: AuditRepository,
    private readonly stateFactory: ReservationStateFactory,
  ) {}

  async checkCheckInOutDatesAvailability(
    checkInDate: string,
    checkOutDate: string,
    roomId: string,
  ): Promise<boolean> {
    // Implementar lógica para verificar disponibilidad de fechas
    const reservedReservationsIds =
      await this.reservationRepository.getReservedReservationsIds(
        new Date(checkInDate),
        new Date(checkOutDate),
        roomId,
      );
    return reservedReservationsIds.length > 0;
  }

  async checkCheckInDateItsNotInThePast(checkInDate: string): Promise<boolean> {
    const currentDateLima = getCurrentLimaDate();
    const checkInDateObj = new Date(checkInDate);
    return checkInDateObj.getDay() >= currentDateLima.getDay();
  }

  async execute(
    ids: string[],
    user: UserData,
  ): Promise<BaseApiResponse<UpdateManyResponseDto>> {
    try {
      const results = {
        successful: [] as string[],
        failed: [] as Array<{ id: string; reason: string }>,
      };

      // Validar que se reciban IDs
      if (!ids || ids.length === 0) {
        throw new BadRequestException(
          'Debe proporcionar al menos un ID de reservación',
        );
      }

      // Procesar todos los IDs en una única transacción
      await this.reservationRepository.transaction(async (tx) => {
        // 1. Obtener todas las reservaciones en una sola consulta
        const existingReservations = await this.reservationRepository.findMany({
          where: {
            id: {
              in: ids,
            },
          },
        });

        // Crear un mapa para acceso rápido por ID
        const reservationsMap = new Map(
          existingReservations.map((reservation) => [
            reservation.id,
            reservation,
          ]),
        );

        // 2. Identificar IDs que no existen
        const notFoundIds = ids.filter((id) => !reservationsMap.has(id));

        // Registrar IDs no encontrados como fallidos
        notFoundIds.forEach((id) => {
          results.failed.push({
            id,
            reason: `Reservación con ID ${id} no encontrada`,
          });
        });

        // 3. Procesar las reservaciones existentes
        for (const id of ids) {
          // Omitir IDs que no existen
          if (!reservationsMap.has(id)) continue;

          const reservation = reservationsMap.get(id);

          try {
            // Verificar si la reservación ya está activa
            if (reservation.isActive) {
              results.failed.push({
                id,
                reason: 'La reservación ya se encuentra activa',
              });
              continue;
            }

            const currentAvailableActions =
              this.stateFactory.getAvailableActions(reservation.status);

            if (!currentAvailableActions.canReactivate) {
              results.failed.push({
                id,
                reason:
                  'No puede reactivar esta reservación por su estado actual',
              });
              continue;
            }

            const checkInDateHasToCome =
              await this.checkCheckInDateItsNotInThePast(
                reservation.checkInDate,
              );
            if (!checkInDateHasToCome) {
              results.failed.push({
                id,
                reason:
                  'No se puede reactivar la reservación porque la fecha de check-in ya pasó o es hoy',
              });
              continue;
            }

            const isAbleToBeReactivated =
              await this.checkCheckInOutDatesAvailability(
                reservation.checkInDate,
                reservation.checkOutDate,
                reservation.roomId,
              );

            if (!isAbleToBeReactivated) {
              results.failed.push({
                id,
                reason:
                  'No se puede reactivar la reservación porque no hay fechas disponibles para el check-in y check-out que tenía originalmente',
              });
              continue;
            }

            // 4. Actualizar la reservación
            await this.reservationRepository.updateWithTx(
              id,
              {
                isActive: true,
                updatedAt: new Date(),
              },
              tx,
            );

            // 5. Registrar auditoría
            await this.auditRepository.createWithTx(
              {
                entityId: id,
                entityType: 'reservation',
                action: AuditActionType.REACTIVATE,
                performedById: user.id,
              },
              tx,
            );

            results.successful.push(id);
          } catch (error) {
            this.logger.error(
              `Error al procesar reservación ${id}: ${error.message}`,
            );
            results.failed.push({
              id,
              reason: 'Error interno al procesar la reservación',
            });
          }
        }
      });

      return {
        success: results.successful.length > 0,
        message: `Reactivación de reservaciones completada. ${results.successful.length} exitosas, ${results.failed.length} fallidas.`,
        data: results,
      };
    } catch (error) {
      this.logger.error(`Error al reactivar reservaciones: ${error.message}`, {
        error,
      });

      if (error instanceof BadRequestException) {
        throw error;
      }

      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        const userMessage = this.getPrismaErrorMessage(error);
        throw new BadRequestException(userMessage);
      }

      throw new InternalServerErrorException(
        'Ocurrió un error al reactivar las reservaciones. Por favor, intente nuevamente.',
      );
    }
  }

  private getPrismaErrorMessage(
    error: Prisma.PrismaClientKnownRequestError,
  ): string {
    switch (error.code) {
      case 'P2002':
        return `Ya existe una reservación con estos datos: ${error.meta?.target}`;
      case 'P2003':
        return 'No se pudo actualizar la reservación porque alguno de los registros relacionados no existe';
      case 'P2025':
        return 'No se encontró la reservación o alguno de los registros necesarios para esta operación';
      default:
        return `Error al procesar la reservación: ${error.code}`;
    }
  }
}
