import { Injectable } from '@nestjs/common';
import { ReservationRepository } from '../repository/reservation.repository';
import { CreateReservationDto } from '../dto/create-reservation.dto';
import { UserData } from 'src/interfaces';
import { AuditActionType } from '@prisma/client';
import { BaseApiResponse } from 'src/utils/base-response/BaseApiResponse.dto';
import { GuestBuilder, Guests } from '../entities/guest.entity';
import { AuditService } from 'src/modules/admin/audit/audit.service';
import { Reservation } from '../entities/reservation.entity';

@Injectable()
export class CreateReservationUseCase {
  constructor(
    private readonly reservationRepository: ReservationRepository,
    private readonly auditService: AuditService,
  ) {}

  async execute(
    createOrderDto: CreateReservationDto,
    user: UserData,
  ): Promise<BaseApiResponse<Reservation>> {
    const newReservation = await this.reservationRepository.transaction(
      async () => {
        const guests = createOrderDto.guests.map((guest) => {
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
        // Create order
        const reservation = await this.reservationRepository.create({
          customerId: createOrderDto.customerId,
          roomId: createOrderDto.roomId,
          userId: user.id,
          reservationDate: new Date(),
          checkInDate: createOrderDto.checkInDate,
          checkOutDate: createOrderDto.checkOutDate,
          status: createOrderDto.status,
          ...(createOrderDto.guests && {
            guests: new Guests(guests).stringify(),
          }),
          ...(createOrderDto.observations && {
            observations: createOrderDto.observations,
          }),
        });

        // Register audit
        await this.auditService.create({
          entityId: reservation.id,
          entityType: 'reservation',
          action: AuditActionType.CREATE,
          performedById: user.id,
          createdAt: new Date(),
        });

        return reservation;
      },
    );

    return {
      success: true,
      message: 'Reservación creada exitosamente',
      data: newReservation,
    };
  }
}
