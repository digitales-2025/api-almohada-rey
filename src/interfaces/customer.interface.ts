import {
  Customer,
  PaymentDetailMethod,
  PaymentDetailStatus,
  PaymentDetailType,
  Prisma,
  ReservationStatus,
} from '@prisma/client';

export type CustomerData = Pick<
  Customer,
  | 'id'
  | 'name'
  | 'address'
  | 'birthPlace'
  | 'country'
  | 'phone'
  | 'occupation'
  | 'documentType'
  | 'documentNumber'
  | 'email'
  | 'maritalStatus'
  | 'isActive'
> & {
  department?: string;
  province?: string;
  companyName?: string;
  ruc?: string;
  companyAddress?: string;
};

export type HistoryCustomerData = Pick<Customer, 'id' | 'name'> & {
  reservations: {
    id: string;
    reservationDate: Date;
    checkInDate: Date;
    checkOutDate: Date;
    guests: Prisma.JsonValue; // Usar el tipo JsonValue de Prisma en lugar de string
    reason: string;
    numberGuests: number;
    observations?: string;
    status: ReservationStatus;
    room: {
      id: string;
      number: number;
      RoomTypes: {
        id: string;
        name: string;
        price: number;
      };
    };
    payment: {
      id: string;
      date: string;
      amount: number;
      amountPaid: number;
      paymentDetail: {
        id: string;
        paymentDate: string;
        description: string;
        type: PaymentDetailType;
        method: PaymentDetailMethod;
        status: PaymentDetailStatus;
        unitPrice: number;
        subtotal: number;
        quantity?: number;
        service?: {
          id: string;
          name: string;
        };
        days?: number;
        room?: {
          id: string;
          number: number;
          RoomTypes: {
            id: string;
            name: string;
          };
        };
      }[];
    };
  }[];
};
