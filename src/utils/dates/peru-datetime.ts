// Importa las funciones con los nombres correctos para la versión moderna de la librería
import { toZonedTime, fromZonedTime, format } from 'date-fns-tz';
import { es } from 'date-fns/locale';
import { SupportedLocales } from 'src/modules/landing/i18n/translations';

// --- CONFIGURACIÓN ---

export const LIMA_TIMEZONE_NAME = 'America/Lima';

const STANDARD_CHECK_IN_TIME = '15:00';
const STANDARD_CHECK_OUT_TIME = '12:00';

// --- FUNCIONES CORREGIDAS ---

/**
 * Obtiene la fecha y hora actual en la zona horaria de Lima.
 */
export function getCurrentLimaTime(): Date {
  // Usa el nuevo nombre: toZonedTime
  return toZonedTime(new Date(), LIMA_TIMEZONE_NAME);
}

/**
 * Obtiene el inicio del día (medianoche) para una fecha dada en la zona horaria de Lima.
 */
export function getStartOfLimaDay(date?: Date): Date {
  const targetDate = date || new Date();

  // 1. Interpreta la fecha en la zona horaria de Lima
  const limaDate = toZonedTime(targetDate, LIMA_TIMEZONE_NAME);

  // 2. Establece la hora a la medianoche
  limaDate.setHours(0, 0, 0, 0);

  // 3. Convierte de vuelta a UTC usando el nuevo nombre: fromZonedTime
  return fromZonedTime(limaDate, LIMA_TIMEZONE_NAME);
}

/**
 * Construye la fecha y hora de check-in estándar para un día específico en Lima.
 */
export const getCheckInDate = (date?: Date): Date => {
  const targetDate = toZonedTime(date || new Date(), LIMA_TIMEZONE_NAME);
  const [hours, minutes] = STANDARD_CHECK_IN_TIME.split(':').map(Number);

  targetDate.setHours(hours, minutes, 0, 0);

  // Usa el nuevo nombre: fromZonedTime
  return fromZonedTime(targetDate, LIMA_TIMEZONE_NAME);
};

/**
 * Construye la fecha y hora de check-out estándar para un día específico en Lima.
 */
export const getCheckOutDate = (date?: Date): Date => {
  const targetDate = toZonedTime(date || new Date(), LIMA_TIMEZONE_NAME);
  const [hours, minutes] = STANDARD_CHECK_OUT_TIME.split(':').map(Number);

  targetDate.setHours(hours, minutes, 0, 0);

  // Usa el nuevo nombre: fromZonedTime
  return fromZonedTime(targetDate, LIMA_TIMEZONE_NAME);
};

// --- FUNCIÓN DE FORMATO (SIN CAMBIOS, YA ERA CORRECTA) ---

type DateFormatOptions = {
  short: string;
  long: string;
};

export function formatDateToLimaTimezone(
  date: Date,
  locale?: SupportedLocales,
): DateFormatOptions {
  const formatLocale = locale === 'en' ? undefined : es;

  const shortFormat = format(date, 'dd/MM/yyyy', {
    timeZone: LIMA_TIMEZONE_NAME,
    locale: formatLocale,
  });
  const longFormat = format(date, 'EEEE, dd/MM/yyyy', {
    timeZone: LIMA_TIMEZONE_NAME,
    locale: formatLocale,
  });

  return {
    short: shortFormat,
    long: longFormat,
  };
}

// --- FUNCIÓN PARA CALCULAR NOCHES CON LÓGICA DE LATE CHECKOUT ---
export function calculateStayNights(
  checkInDate: string,
  checkOutDate: string,
  appliedLateCheckOut?: boolean,
): number {
  const checkIn = new Date(checkInDate);
  const checkOut = new Date(checkOutDate);

  // Si hay late checkout aplicado, ajustamos el cálculo para no contar las horas extras como un día adicional
  if (appliedLateCheckOut) {
    // Creamos una fecha de checkout ajustada a las 12:00 PM de ese día
    const adjustedCheckOut = new Date(checkOut);
    adjustedCheckOut.setHours(12, 0, 0, 0);

    // Si el checkout original es después del mediodía, usamos el checkout ajustado
    if (checkOut.getHours() > 12) {
      const utcCheckIn = Date.UTC(
        checkIn.getUTCFullYear(),
        checkIn.getUTCMonth(),
        checkIn.getUTCDate(),
      );
      const utcAdjustedCheckOut = Date.UTC(
        adjustedCheckOut.getUTCFullYear(),
        adjustedCheckOut.getUTCMonth(),
        adjustedCheckOut.getUTCDate(),
      );

      const millisecondsPerDay = 1000 * 60 * 60 * 24;
      const diffDays = (utcAdjustedCheckOut - utcCheckIn) / millisecondsPerDay;

      return diffDays > 0 ? diffDays : 0;
    }
  }

  // Si no hay late checkout o el checkout es antes del mediodía, usamos el cálculo normal
  const utcCheckIn = Date.UTC(
    checkIn.getUTCFullYear(),
    checkIn.getUTCMonth(),
    checkIn.getUTCDate(),
  );
  const utcCheckOut = Date.UTC(
    checkOut.getUTCFullYear(),
    checkOut.getUTCMonth(),
    checkOut.getUTCDate(),
  );

  const millisecondsPerDay = 1000 * 60 * 60 * 24;
  const diffDays = (utcCheckOut - utcCheckIn) / millisecondsPerDay;

  return diffDays > 0 ? diffDays : 0;
}
