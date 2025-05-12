import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { ProfitData } from '../interfaces/profit-fields';
/* import {
  DailyExpensesByDay , ExpenseData,
} from '../interfaces/expense-fields'; */
/* import { BalanceData } from '../interfaces/balance'; */
import { ExpenseData } from '../interfaces/expense-fields';

// Puedes agregar todas las tablas relevantes para el profit
const PROFIT_TABLES = ['reservation', 'movements', 'otro'];
/* const EXPENSE_TABLES = ['expense', 'otro_expense']; */

const PROFIT_FIELDS = {
  id: true,
  amount: true,
  date: true,
  // otros campos relevantes...
};

/* const EXPENSE_FIELDS = {
  id: true,
  amount: true,
  date: true,
  // otros campos relevantes...
}; */

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
  /*   async getExpense(month: number, year: number): Promise<ExpenseData[]> {
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
  } */

  /**
   * Obtiene los datos de profit y expense para el balance,
   * retornando ambos arreglos en un solo objeto.
   * @param month Mes numérico (1-12)
   * @param year Año (YYYY)
   * @returns Objeto con arreglos profit y expense
   */
  /*  async getBalance(month: number, year: number): Promise<BalanceData> {
    const [profit, expense] = await Promise.all([
      this.getProfit(month, year),
      this.getExpense(month, year),
    ]);
    return { profit, expense };
  } */

  /**
   * Obtiene los gastos diarios agrupados por día para un mes y año específicos.
   * @param month Mes numérico (1-12)
   * @param year Año (YYYY)
   * @returns Objeto con los gastos diarios agrupados por día
   */

  async getExpense(month: number, year: number): Promise<ExpenseData[]> {
    const startDate = new Date(
      `${year}-${month.toString().padStart(2, '0')}-01`,
    );
    const endDate = new Date(
      month === 12
        ? `${year + 1}-01-01`
        : `${year}-${(month + 1).toString().padStart(2, '0')}-01`,
    );

    // Movements INPUT (gastos de inventario)
    const inputMovements = await this.prisma.movements.findMany({
      where: {
        type: 'INPUT',
        dateMovement: {
          gte: startDate.toISOString().slice(0, 10),
          lt: endDate.toISOString().slice(0, 10),
        },
      },
      select: {
        id: true,
        dateMovement: true,
        description: true,
        movementsDetail: {
          select: { subtotal: true },
        },
      },
      orderBy: { dateMovement: 'asc' },
    });

    // HotelExpense (gastos directos)
    const hotelExpenses = await this.prisma.hotelExpense.findMany({
      where: {
        date: {
          gte: startDate.toISOString().slice(0, 10),
          lt: endDate.toISOString().slice(0, 10),
        },
      },
      select: {
        id: true,
        date: true,
        description: true,
        category: true,
        paymentMethod: true,
        amount: true,
        documentType: true,
        documentNumber: true,
      },
      orderBy: { date: 'asc' },
    });

    // Unifica ambos en un solo array plano
    const expenses: ExpenseData[] = [
      ...inputMovements.map(
        (mov): ExpenseData => ({
          id: mov.id,
          amount: mov.movementsDetail.reduce(
            (sum, det) => sum + det.subtotal,
            0,
          ),
          date: mov.dateMovement,
          description: mov.description ?? null,
          category: 'INVENTARIO',
          paymentMethod: null,
          documentType: null,
          documentNumber: null,
          type: 'INVENTORY_INPUT',
        }),
      ),
      ...hotelExpenses.map(
        (exp): ExpenseData => ({
          id: exp.id,
          amount: exp.amount,
          date: exp.date,
          description: exp.description ?? null,
          category: exp.category ?? null,
          paymentMethod: exp.paymentMethod ?? null,
          documentType: exp.documentType ?? null,
          documentNumber: exp.documentNumber ?? null,
          type: 'HOTEL_EXPENSE',
        }),
      ),
    ];

    return expenses;
  }
}
