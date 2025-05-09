import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { ProfitData } from '../interfaces/profit-fields';
import { ExpenseData } from '../interfaces/expense-fields';
import { BalanceData } from '../interfaces/balance';

// Puedes agregar todas las tablas relevantes para el profit
const PROFIT_TABLES = ['reservation', 'movements', 'otro'];
const EXPENSE_TABLES = ['expense', 'otro_expense'];

const PROFIT_FIELDS = {
  id: true,
  amount: true,
  date: true,
  // otros campos relevantes...
};

const EXPENSE_FIELDS = {
  id: true,
  amount: true,
  date: true,
  // otros campos relevantes...
};

@Injectable()
export class ReportsRepository {
  constructor(private readonly prisma: PrismaService) {}

  /*   HotelExpense+

  Reservation =conf = checin+
  
  Payment + amountPaid = total general+
  
  PaymentDetail= fecha de reporte = paymentDate */

  /**
   * Obtiene los datos de profit (ganancias) de todas las tablas configuradas,
   * filtrando por mes y año.
   * @param month Mes numérico (1-12)
   * @param year Año (YYYY)
   * @returns Arreglo de objetos ProfitData
   */
  async getProfit(month: number, year: number): Promise<ProfitData[]> {
    // Consultar todas las tablas de profit y combinar los resultados
    const results = await Promise.all(
      PROFIT_TABLES.map((table) =>
        this.prisma[table].findMany({
          where: {
            date: {
              gte: new Date(`${year}-${month.toString().padStart(2, '0')}-01`),
              lt: new Date(
                `${year}-${(month + 1).toString().padStart(2, '0')}-01`,
              ),
            },
          },
          select: PROFIT_FIELDS,
        }),
      ),
    );
    // Combinar todos los resultados en un solo array
    return results.flat();
  }

  /**
   * Obtiene los datos de expense (gastos) de todas las tablas configuradas,
   * filtrando por mes y año.
   * @param month Mes numérico (1-12)
   * @param year Año (YYYY)
   * @returns Arreglo de objetos ExpenseData
   */
  async getExpense(month: number, year: number): Promise<ExpenseData[]> {
    const results = await Promise.all(
      EXPENSE_TABLES.map((table) =>
        this.prisma[table].findMany({
          where: {
            date: {
              gte: new Date(`${year}-${month.toString().padStart(2, '0')}-01`),
              lt: new Date(
                `${year}-${(month + 1).toString().padStart(2, '0')}-01`,
              ),
            },
          },
          select: EXPENSE_FIELDS,
        }),
      ),
    );
    return results.flat();
  }

  /**
   * Obtiene los datos de profit y expense para el balance,
   * retornando ambos arreglos en un solo objeto.
   * @param month Mes numérico (1-12)
   * @param year Año (YYYY)
   * @returns Objeto con arreglos profit y expense
   */
  async getBalance(month: number, year: number): Promise<BalanceData> {
    const [profit, expense] = await Promise.all([
      this.getProfit(month, year),
      this.getExpense(month, year),
    ]);
    return { profit, expense };
  }
}
