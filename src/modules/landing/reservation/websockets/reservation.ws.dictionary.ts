import { GenericDictionary } from '../../i18n/translations';
import { SendingEvents, ValidationMessages } from './ws.types';

type BookingMessages = SendingEvents;

export const reservationWsMessagesDictionary: GenericDictionary<BookingMessages> =
  {
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
  };
