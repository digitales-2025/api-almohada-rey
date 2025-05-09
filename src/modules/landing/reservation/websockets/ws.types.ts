import { BaseSendingEvents } from 'src/websockets/types/base-sending.events.types';

export type ListeningEvents = {
  startBookingPayment: 'startBookingPayment';
  cancelBookingPayment: 'cancelBookingPayment';
  completeBookingPayment: 'completeBookingPayment';
  errorBookingPayment: 'errorBookingPayment';
};

export type SendingEvents = {
  onStartBookingPayment: 'onStartBookingPayment';
  onCancelBookingPayment: 'onCancelBookingPayment';
  onCompleteBookingPayment: 'onCompleteBookingPayment';
  onErrorBookingPayment: 'onErrorBookingPayment';
} & BaseSendingEvents;

export const listeningEvents: ListeningEvents = {
  startBookingPayment: 'startBookingPayment',
  cancelBookingPayment: 'cancelBookingPayment',
  completeBookingPayment: 'completeBookingPayment',
  errorBookingPayment: 'errorBookingPayment',
};

export const sendingEvents: SendingEvents = {
  onStartBookingPayment: 'onStartBookingPayment',
  onCancelBookingPayment: 'onCancelBookingPayment',
  onCompleteBookingPayment: 'onCompleteBookingPayment',
  onErrorBookingPayment: 'onErrorBookingPayment',
  onConnection: 'onConnection',
  onDisconnection: 'onDisconnection',
};

// export type ReservationWsEvents = [
//   keyof typeof sendingEvents,
//   keyof typeof listeningEvents,
// ];
export type ReservationWsEventsKeys =
  | keyof typeof sendingEvents
  | keyof typeof listeningEvents;

export type SendingEventsKeys = keyof SendingEvents;

export type ValidationMessages = {
  invalidClientSocketId: string;
  missingReservationId: string;
  noReservationFound: string;
  noValidReservationStatus: string;
  cancelReservationException: string;
  updateReservationException: string;
  confirmReservationException: string;
};
