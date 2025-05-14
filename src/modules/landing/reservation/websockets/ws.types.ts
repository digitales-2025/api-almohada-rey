import { BaseSendingEvents } from 'src/websockets/types/base-sending.events.types';

export type PongClientEvent = {
  pong: 'pong';
};

export type PingEvent = {
  ping: 'ping';
};

export type OnPongEvent = {
  onPong: 'onPong';
  onNoPing: 'onNoPing';
};

export type ListeningEvents = {
  startBookingPayment: 'startBookingPayment';
  cancelBookingPayment: 'cancelBookingPayment';
  completeBookingPayment: 'completeBookingPayment';
  errorBookingPayment: 'errorBookingPayment';
  pong: 'pong';
} & PongClientEvent;

export type SendingEvents = {
  onStartBookingPayment: 'onStartBookingPayment';
  onCancelBookingPayment: 'onCancelBookingPayment';
  onCompleteBookingPayment: 'onCompleteBookingPayment';
  onErrorBookingPayment: 'onErrorBookingPayment';
} & OnPongEvent &
  PingEvent &
  BaseSendingEvents;

export const listeningEvents: ListeningEvents = {
  startBookingPayment: 'startBookingPayment',
  cancelBookingPayment: 'cancelBookingPayment',
  completeBookingPayment: 'completeBookingPayment',
  errorBookingPayment: 'errorBookingPayment',
  pong: 'pong',
};

export const sendingEvents: SendingEvents = {
  onStartBookingPayment: 'onStartBookingPayment',
  onCancelBookingPayment: 'onCancelBookingPayment',
  onCompleteBookingPayment: 'onCompleteBookingPayment',
  onErrorBookingPayment: 'onErrorBookingPayment',

  // BaseSendingEvents
  ping: 'ping',
  onPong: 'onPong',
  onNoPing: 'onNoPing',
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
  unstableConnection: string;
  noReservationFound: string;
  reservationAlreadyInUse: string;
  noValidReservationStatus: string;
  cancelReservationException: string;
  updateReservationException: string;
  confirmReservationException: string;
};
