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

/**
 * Calcula el número de noches entre dos fechas, teniendo en cuenta si se aplicó late checkout
 * @param checkInDate Fecha de entrada en formato ISO
 * @param checkOutDate Fecha de salida en formato ISO
 * @param appliedLateCheckOut Indica si se aplicó late checkout a la reserva
 * @returns Número de noches de la estancia
 */
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
      const diffTime = adjustedCheckOut.getTime() - checkIn.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays;
    }
  }

  // Si no hay late checkout o el checkout es antes del mediodía, usamos el cálculo normal
  const diffTime = checkOut.getTime() - checkIn.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays;
}
