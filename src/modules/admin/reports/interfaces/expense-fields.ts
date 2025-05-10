export interface ExpenseData {
  id: string;
  amount: number;
  date: Date | string;
  // otros campos relevantes...
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
