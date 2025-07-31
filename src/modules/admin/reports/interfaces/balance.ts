import { ExpenseData } from './expense-fields';
import { ProfitData } from './profit-fields';

// Puedes crear este tipo en un archivo de interfaces
export interface BalanceData {
  profit: ProfitData[];
  expense: ExpenseData[];
}
