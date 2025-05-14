import { SupportedLocales } from 'src/modules/landing/i18n/translations';

export const LIMA_TIMEZONE = {
  /** Lima, Peru timezone offset in hours (UTC-5) */
  OFFSET_HOURS: -5,
  /** Lima, Peru timezone offset in minutes */
  OFFSET_MINUTES: -5 * 60,
};

// Constantes para conversión de tiempo
const MILLISECONDS_PER_MINUTE = 60000; // 1000ms * 60s

const standarCheckInTime = '15:00';
const standarCheckOutTime = '12:00';

export const getLimaTime = (date?: Date): Date => {
  // Get current date in UTC
  const utcDate = new Date();

  if (date) {
    // If a date is provided, use it instead of the current date
    utcDate.setTime(date.getTime());
  }
  // Convert to Lima, Peru timezone (UTC-5)
  const limaTime = new Date(
    utcDate.getTime() + LIMA_TIMEZONE.OFFSET_MINUTES * MILLISECONDS_PER_MINUTE,
  );
  return limaTime;
};

// export const getStartofLimeToday = (date?: Date): Date => {
//   // Get current date in UTC
//   const utcDate = new Date();
//   if (date) {
//     // If a date is provided, use it instead of the current date
//     utcDate.setTime(date.getTime());
//   }
//   // Convert to Lima, Peru timezone (UTC-5)
//   const limaTime = new Date(
//     utcDate.getTime() + LIMA_TIMEZONE.OFFSET_MINUTES * MILLISECONDS_PER_MINUTE,
//   );
//   // Set the time to beginning of the day in Lima timezone
//   return new Date(
//     limaTime.getFullYear(),
//     limaTime.getMonth(),
//     limaTime.getDate(),
//     0,
//     0,
//     0,
//     0,
//   );
// };

export function getCurrentLimaDate(): Date {
  // Get current date in UTC
  const limaTime = getLimaTime();

  // Set the time to beginning of the day in Lima timezone
  return new Date(
    limaTime.getFullYear(),
    limaTime.getMonth(),
    limaTime.getDate(),
    0,
    0,
    0,
    0,
  );
}

/**
 * Obtiene la fecha y hora de check-in basada en la hora estándar de check-in.
 *
 * Este método convierte una fecha opcional a la zona horaria de Lima, Perú, y
 * establece la hora según el formato estándar de check-in definido en el sistema.
 *
 * @param {Date} [date] - Fecha opcional a convertir. Si no se proporciona, se usa la fecha actual.
 * @returns {Date} La fecha y hora de check-in en la zona horaria de Lima.
 */
export const getCheckInDate = (date?: Date): Date => {
  const limaTime = getLimaTime(date);
  const checkInDate = new Date(
    limaTime.getFullYear(),
    limaTime.getMonth(),
    limaTime.getDate(),
    parseInt(standarCheckInTime.split(':')[0]),
    parseInt(standarCheckInTime.split(':')[1]),
    0,
    0,
  );
  return checkInDate;
};

/**
 * Calcula la fecha y hora de check-out basada en la hora estándar de check-out.
 *
 * @param date - Objeto Date opcional. Si no se proporciona, se utilizará la fecha y hora actual.
 * @returns Un objeto Date que representa la fecha y hora de check-out en la zona horaria de Lima (Perú).
 *
 * @example
 * // Obtener la fecha de check-out para hoy
 * const today = getCheckOutDate();
 *
 * // Obtener la fecha de check-out para una fecha específica
 * const specificDate = getCheckOutDate(new Date('2023-12-25'));
 */
export const getCheckOutDate = (date?: Date): Date => {
  const limaTime = getLimaTime(date);
  const checkOutDate = new Date(
    limaTime.getFullYear(),
    limaTime.getMonth(),
    limaTime.getDate(),
    parseInt(standarCheckOutTime.split(':')[0]),
    parseInt(standarCheckOutTime.split(':')[1]),
    0,
    0,
  );
  return checkOutDate;
};

type DateFormatOptions = {
  short: string;
  long: string;
};

export function formatDateToLimaTimezone(
  date: Date,
  locale?: SupportedLocales,
): DateFormatOptions {
  // Convert to Lima, Peru timezone (UTC-5)
  const limaTime = getLimaTime(date);
  let localScopeLocale: SupportedLocales | 'es-PE' | undefined;

  if (!locale) {
    // If no locale is provided, use the default locale
    localScopeLocale = 'es-PE';
  } else {
    // Handle locale conversion if locale exists
    localScopeLocale = locale === 'es' ? 'es-PE' : locale;
  }

  // Format the date to a readable string
  const shortFormat = limaTime.toLocaleDateString(localScopeLocale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  const longFormat = limaTime.toLocaleDateString(localScopeLocale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'narrow',
  });

  return {
    short: shortFormat,
    long: longFormat,
  };
}

export function calculateStayNights(
  checkInDate: string,
  checkOutDate: string,
): number {
  const checkIn = new Date(checkInDate);
  const checkOut = new Date(checkOutDate);

  // Calculamos la diferencia en milisegundos y convertimos a días
  const diffTime = checkOut.getTime() - checkIn.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays;
}
