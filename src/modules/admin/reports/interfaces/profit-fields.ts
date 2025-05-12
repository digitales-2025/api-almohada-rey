export interface ProfitData {
  id: string;
  amount: number;
  date: string; // YYYY-MM-DD
  type: 'ROOM' | 'EXTRA'; // Tipo de ingreso
  roomTypeName?: string; // Solo para habitaciones
  extraName?: string; // Solo para extras
}
