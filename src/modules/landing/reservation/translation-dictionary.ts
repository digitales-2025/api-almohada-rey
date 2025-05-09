import { Dictionary } from '../i18n/translations';

export const errorDictionary: Dictionary = {
  reservation_RoomNotFound: {
    es: 'Habitación no encontrada',
    en: 'Room not found',
  },
  reservation_NonAvailaleRoom: {
    es: 'Habitación no disponible',
    en: 'Room unavailable',
  },
  reservation_InvalidDate: {
    es: 'Fecha inválida',
    en: 'Invalid date',
  },
  reservationCheckinAfterCheckout: {
    es: 'La fecha de check-in debe ser anterior a la fecha de check-out',
    en: 'Check-in date must be before check-out date',
  },
  reservation_InvalidGuestNumber: {
    es: 'Número de huéspedes inválido',
    en: 'Invalid guest number',
  },
  reservation_DateInThePast: {
    es: 'La fecha de check-in no puede ser en el pasado',
    en: 'Check-in date cannot be in the past',
  },
  reservation_CancellationException: {
    es: 'Error al cancelar la reserva',
    en: 'Error canceling the reservation',
  },
  reservation_confirmationException: {
    es: 'Error al confirmar la reserva',
    en: 'Error confirming the reservation',
  },
};
