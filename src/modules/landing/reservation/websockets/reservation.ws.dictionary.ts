import { GenericDictionary } from '../../i18n/translations';
import { SendingEvents, ValidationMessages } from './ws.types';

type BookingMessages = SendingEvents;

export const reservationWsMessagesDictionary: GenericDictionary<BookingMessages> =
  {
    ping: {
      en: 'ping',
      es: 'ping',
    },
    onPong: {
      en: 'onPong',
      es: 'onPong',
    },
    onNoPing: {
      en: 'Unstable connection',
      es: 'Conexión inestable',
    },
    onStartBookingPayment: {
      en: 'Proceed',
      es: 'Proceder',
    },
    onCancelBookingPayment: {
      en: 'Booking payment has been canceled',
      es: 'El pago de la reserva ha sido cancelado',
    },
    onCompleteBookingPayment: {
      en: 'Booking payment has been completed',
      es: 'El pago de la reserva ha sido completado',
    },
    onErrorBookingPayment: {
      en: 'An error occurred during the booking payment process',
      es: 'Se produjo un error durante el proceso de pago de la reserva',
    },
    onConnection: {
      en: 'New client connected',
      es: 'Nuevo cliente conectado',
    },
    onDisconnection: {
      en: 'Client disconnected',
      es: 'Cliente desconectado',
    },
  };

export const validationMessagesDictionary: GenericDictionary<ValidationMessages> =
  {
    invalidClientSocketId: {
      en: 'Invalid client socket ID',
      es: 'ID de socket de cliente no válido',
    },
    missingReservationId: {
      en: 'Missing reservation ID',
      es: 'ID de reserva faltante',
    },
    noReservationFound: {
      en: 'No reservation found',
      es: 'No se encontró ninguna reserva',
    },
    unstableConnection: {
      en: 'Unstable connection',
      es: 'Conexión inestable',
    },
    reservationAlreadyInUse: {
      en: 'It is not possible to make the reservation',
      es: 'No se puede realizar la reservación',
    },
    noValidReservationStatus: {
      en: 'No valid reservation status',
      es: 'Estado de reserva no válido',
    },
    cancelReservationException: {
      en: 'An error occurred while canceling the reservation',
      es: 'Ocurrió un error al cancelar la reserva',
    },
    updateReservationException: {
      en: 'An error occurred while updating the reservation',
      es: 'Ocurrió un error al actualizar la reserva',
    },
    confirmReservationException: {
      en: 'An error occurred while confirming the reservation',
      es: 'Ocurrió un error al confirmar la reserva',
    },
  };
