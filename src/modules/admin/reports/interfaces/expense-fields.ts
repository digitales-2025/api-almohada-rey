export interface ExpenseData {
  id: string; // ID único del gasto o movimiento
  amount: number; // Monto total del gasto
  date: string; // Fecha del gasto (formato YYYY-MM-DD)
  description: string | null; // Descripción del gasto
  category: string | null; // Categoría (por ejemplo, 'INVENTARIO', 'SERVICIOS', etc.)
  paymentMethod: string | null; // Método de pago (efectivo, tarjeta, etc.)

  // Campos para movimientos
  movimientosBoleta: number; // Total INVENTORY_INPUT con documentType=RECEIPT
  movimientosFactura: number; // Total INVENTORY_INPUT con documentType=INVOICE
  movimientosOtro: number; // Total INVENTORY_INPUT con documentType=OTHER o null
  totalMovimientos: number; // Nuevo campo

  // Campos para gastos
  gastosBoleta: number; // Total HOTEL_EXPENSE con documentType=RECEIPT
  gastosFactura: number; // Total HOTEL_EXPENSE con documentType=INVOICE
  gastosOtro: number; // Total HOTEL_EXPENSE con documentType=OTHER o null
  totalGastos: number; // Nuevo campo

  // Mantenemos el tipo para informativo
  type: 'INVENTORY_INPUT' | 'HOTEL_EXPENSE'; // Tipo de gasto
}

export interface DailyInventoryInput {
  type: 'INVENTORY_INPUT';
  description: string | null;
  products: { name: string | null; subtotal: number }[];
  total: number;
}

export interface DailyHotelExpense {
  type: 'HOTEL_EXPENSE';
  description: string;
  category: string;
  paymentMethod: string;
  amount: number;
  documentType: string | null;
  documentNumber: string | null;
  total: number;
}

export type DailyExpense = DailyInventoryInput | DailyHotelExpense;
export type DailyExpensesByDay = Record<string, DailyExpense[]>;
