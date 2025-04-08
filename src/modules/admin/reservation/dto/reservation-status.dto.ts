import { ApiProperty } from '@nestjs/swagger';
import { ReservationStatus as PrismaReservationStatus } from '@prisma/client';
import { IsNotEmpty, IsString } from 'class-validator';
import { ReservationStatus } from '../entities/reservation-status.enum';

export class ReservationStatusDto {
  @ApiProperty({
    description: 'The status of the reservation',
    enum: ReservationStatus,
    example: ReservationStatus.CONFIRMED,
  })
  @IsNotEmpty()
  @IsString()
  status: PrismaReservationStatus;
}
