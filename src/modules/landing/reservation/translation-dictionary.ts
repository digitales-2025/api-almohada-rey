import { Dictionary } from '../supportedLocales';

export const errorDictionary: Dictionary = {
  'reservation.error.roomNotFound': {
    es: 'Habitación no encontrada',
    en: 'Room not found',
  },
  'reservation.error.roomUnavailable': {
    es: 'Habitación no disponible',
    en: 'Room unavailable',
  },
  'reservation.error.invalidDate': {
    es: 'Fecha inválida',
    en: 'Invalid date',
  },
  'reservation.error.checkInAfterCheckOut': {
    es: 'La fecha de check-in debe ser anterior a la fecha de check-out',
    en: 'Check-in date must be before check-out date',
  },
  'reservation.error.invalidGuestNumber': {
    es: 'Número de huéspedes inválido',
    en: 'Invalid guest number',
  },
  'reservation.error.dateInThePast': {
    es: 'La fecha de check-in no puede ser en el pasado',
    en: 'Check-in date cannot be in the past',
  },
};
