import { BaseEntity } from 'src/prisma/src/abstract/base.entity';
import { ReservationStatus } from './reservation-status.enum';
import { ReservationStatus as ReservationStatusPrisma } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';
import { Room } from 'src/modules/admin/room/entities/room.entity';
// import { Customer } from '../../customer/entities/customer.entity';
// import { Room } from '../../room/entities/room.entity';
// import { User } from '../../user/entities/user.entity';

export class Reservation extends BaseEntity {
  @ApiProperty({ description: 'Unique identifier for the reservation' })
  id: string;

  @ApiProperty({ description: 'Customer ID associated with the reservation' })
  customerId: string;

  @ApiProperty({ description: 'Room ID associated with the reservation' })
  roomId: string;

  @ApiProperty({
    description: 'User ID of the staff who created the reservation',
  })
  userId: string;

  @ApiProperty({
    description: 'Date when the reservation was made',
    type: Date,
  })
  reservationDate: Date;

  @ApiProperty({ description: 'Check-in date for the reservation', type: Date })
  checkInDate: Date;

  @ApiProperty({ description: 'Check-out date for the reservation' })
  checkOutDate: Date;

  @ApiProperty({
    description: 'Current status of the reservation',
    enum: ReservationStatus,
  })
  status: ReservationStatusPrisma;

  @ApiProperty({
    description: 'JSON list of companions/guests',
    required: false,
  })
  guests?: string;

  @ApiProperty({
    description: 'Additional notes or observations',
    required: false,
  })
  observations?: string;

  @ApiProperty({
    description: 'Whether the reservation is active',
    required: false,
    default: true,
  })
  isActive?: boolean;

  @ApiProperty({
    description: 'Timestamp when the reservation was created',
    required: false,
    type: Date,
  })
  createdAt?: Date;

  @ApiProperty({
    description: 'Timestamp when the reservation was last updated',
    required: false,
    type: Date,
  })
  updatedAt?: Date;

  constructor(partial: Partial<Reservation>) {
    super(partial);
    Object.assign(this, partial);
  }

  // toJSON(): Record<string, any> {
  //   return {
  //     id: this.id,
  //     customerId: this.customerId,
  //     roomId: this.roomId,
  //     userId: this.userId,
  //     reservationDate: this.reservationDate,
  //     checkInDate: this.checkInDate,
  //     checkOutDate: this.checkOutDate,
  //     status: this.status,
  //     guests: this.guests,
  //     observations: this.observations,
  //     isActive: this.isActive,
  //     createdAt: this.createdAt,
  //     updatedAt: this.updatedAt,
  //   };
  // }
}

export class DetailedReservation extends Reservation {
  // customer: Customer;
  // user: User;
  @ApiProperty({
    description: 'Room associated with the reservation',
    type: Room,
  })
  room: Room;

  constructor(partial: Partial<DetailedReservation>) {
    super(partial);
    Object.assign(this, partial);
  }
}
