import { Payment, PaymentDetail } from '@prisma/client';

export type PaymentData = Pick<
  Payment,
  'id' | 'date' | 'amount' | 'amountPaid' | 'status'
> & {
  observations?: string;
  reservation: {
    id: string;
    checkInDate: Date;
    checkOutDate: Date;
  };
  paymentDetail: PaymentDetailData[];
};

export type PaymentDetailData = Pick<
  PaymentDetail,
  | 'id'
  | 'paymentDate'
  | 'description'
  | 'type'
  | 'method'
  | 'status'
  | 'unitPrice'
  | 'subtotal'
> & {
  quantity?: number;
  product?: {
    id: string;
    name: string;
  };
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
};
