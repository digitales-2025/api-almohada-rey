import { Injectable } from '@nestjs/common';
import { ReportsRepository } from '../repositories/reports.repository';
import { ProfitReportUseCase } from '../use-cases/profit-report.use-case';
import { ExpenseReportUseCase } from '../use-cases/expense-report.use-case';
import { ProfitTypeRoomReportUseCase } from '../use-cases/profit-typeroom-report.use-case';
import { BalanceReportUseCase } from '../use-cases/balance-report.use-case';
// Si tienes un use case para unificar ambos, lo importas también

@Injectable()
export class ReportsService {
  constructor(
    private readonly reportsRepository: ReportsRepository,
    private readonly profitReportUseCase: ProfitReportUseCase,
    private readonly expenseReportUseCase: ExpenseReportUseCase,
    private readonly ProfitTypeRoomReportUseCase: ProfitTypeRoomReportUseCase,
    private readonly balanceReportUseCase: BalanceReportUseCase, // si lo necesitas
  ) {}

  /**
   * Genera y retorna un Excel con los datos de profit (ganancias) del mes y año indicados.
   * @param month Mes numérico (1-12)
   * @param year Año (YYYY)
   * @returns ExcelJS.Workbook con los datos de profit
   */
  async getProfitExcel({ month, year }: { month: number; year: number }) {
    const data = await this.reportsRepository.getProfit(month, year);
    return this.profitReportUseCase.execute(data, { month, year });
  }

  /**
   * Genera y retorna un Excel con los datos de expense (gastos) del mes y año indicados.
   * @param month Mes numérico (1-12)
   * @param year Año (YYYY)
   * @returns ExcelJS.Workbook con los datos de expense
   */
  async getExpenseExcel({ month, year }: { month: number; year: number }) {
    const data = await this.reportsRepository.getExpense(month, year);
    return this.expenseReportUseCase.execute(data, { month, year });
  }

  /**
   * Genera y retorna un Excel con los datos de balance (profit y expense) del mes y año indicados.
   * @param month Mes numérico (1-12)
   * @param year Año (YYYY)
   * @returns ExcelJS.Workbook con los datos de balance
   */
  async getBalanceExcel({ month, year }: { month: number; year: number }) {
    const balanceData = await this.reportsRepository.getBalance(month, year);
    return this.balanceReportUseCase.execute(balanceData, { month, year });
  }

  /**
   * Genera y retorna un Excel con los datos de ganancia por habitación del mes y año indicados.
   * @param month Mes numérico (1-12)
   * @param year Año (YYYY)
   * @param typeRoomId ID del tipo de habitación
   * @returns ExcelJS.Workbook con los datos de balance
   */
  async getProfitTypeRoomExcel({
    month,
    year,
    typeRoomId,
  }: {
    month: number;
    year: number;
    typeRoomId: string;
  }) {
    const data = await this.reportsRepository.getProfitTypeRoom(
      month,
      year,
      typeRoomId,
    );
    return this.ProfitTypeRoomReportUseCase.execute(data, { month, year });
  }
}
