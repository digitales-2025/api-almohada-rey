export const LIMA_TIMEZONE = {
  /** Lima, Peru timezone offset in hours (UTC-5) */
  OFFSET_HOURS: -5,
  /** Lima, Peru timezone offset in minutes */
  OFFSET_MINUTES: -5 * 60,
};

// Constantes para conversión de tiempo
const MILLISECONDS_PER_MINUTE = 60000; // 1000ms * 60s

export function getCurrentLimaDate(): Date {
  // Get current date in UTC
  const utcDate = new Date();

  // Convert to Lima, Peru timezone (UTC-5)
  const limaTime = new Date(
    //Al multiplicar estos valores, estás convirtiendo el desplazamiento de zona horaria a la misma unidad (milisegundos) que usa JavaScript internamente para cálculos de fechas.
    utcDate.getTime() + LIMA_TIMEZONE.OFFSET_MINUTES * MILLISECONDS_PER_MINUTE,
  );

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
