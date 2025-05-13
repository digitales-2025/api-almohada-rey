export interface ProfitRoomTypeData {
  date: string;
  tipoIngreso: string; // Siempre 'Habitación'
  habitacion: string; // Nombre del tipo de habitación
  totalHabitacion: number; // Suma de subtotales de habitaciones
  totalExtras: number; // Suma de subtotales de extras asociados
  totalGeneral: number; // totalHabitacion + totalExtras
}
