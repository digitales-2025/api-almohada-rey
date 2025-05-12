export interface ExpenseData {
  id: string; // ID único del gasto o movimiento
  amount: number; // Monto total del gasto
  date: string; // Fecha del gasto (formato YYYY-MM-DD)
  description: string | null; // Descripción del gasto
  category: string | null; // Categoría (por ejemplo, 'INVENTARIO', 'SERVICIOS', etc.)
  paymentMethod: string | null; // Método de pago (efectivo, tarjeta, etc.)
  documentType: string | null; // Tipo de documento (boleta, factura, etc.)
  documentNumber: string | null; // Número de documento
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
