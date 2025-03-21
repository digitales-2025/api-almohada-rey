import { BaseEntity } from 'src/prisma/src/abstract/base.entity';
import { ReservationStatus } from './reservation-status.enum';
// import { Customer } from '../../customer/entities/customer.entity';
// import { Room } from '../../room/entities/room.entity';
// import { User } from '../../user/entities/user.entity';

export class Reservation extends BaseEntity {
  id: string;
  customerId: string;

  roomId: string;
  userId: string;
  reservationDate: Date;
  checkInDate: Date;
  checkOutDate: Date;
  status: ReservationStatus;
  guests?: string; // Json type for list of companions
  observations?: string;
  isActive?: boolean;
  createdAt?: Date;
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

// export class DetailedReservation extends Reservation {
//   customer: Customer;
//   room: Room;
//   user: User;

//   constructor(partial: Partial<DetailedReservation>) {
//     super(partial);
//     Object.assign(this, partial);
//   }

//   toJSON(): Record<string, any> {
//     return {
//       ...super.toJSON(),
//       customer: this.customer,
//       room: this.room,
//       user: this.user,
//     };
//   }
// }
