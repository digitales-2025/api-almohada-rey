import { BaseEntity } from 'src/prisma/src/abstract/base.entity';

export class Reservation extends BaseEntity {
  id: string;
  name: string;
  hotelName: string;
  arrivalDate: Date;
  departureDate: Date;
  createdAt: Date;
  updatedAt: Date;

  constructor(partial: Partial<Reservation>) {
    super(partial);
    Object.assign(this, partial);
  }

  toJSON(): Record<string, any> {
    return {
      id: this.id,
      name: this.name,
      hotelName: this.hotelName,
      arrivalDate: this.arrivalDate,
      departureDate: this.departureDate,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
