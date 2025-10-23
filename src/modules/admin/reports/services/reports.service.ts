import { Injectable } from '@nestjs/common';
import { ReportsRepository } from '../repositories/reports.repository';
import { ProfitReportUseCase } from '../use-cases/profit-report.use-case';
import { ExpenseReportUseCase } from '../use-cases/expense-report.use-case';
import { ProfitTypeRoomReportUseCase } from '../use-cases/profit-typeroom-report.use-case';
import { BalanceReportUseCase } from '../use-cases/balance-report.use-case';
import { OccupancyStatsResponse } from '../interfaces/occupancy';
import { OccupancyReportUseCase } from '../use-cases/occupancy-report.use-case';
// Si tienes un use case para unificar ambos, lo importas también

@Injectable()
export class ReportsService {
  constructor(
    private readonly reportsRepository: ReportsRepository,
    private readonly profitReportUseCase: ProfitReportUseCase,
    private readonly expenseReportUseCase: ExpenseReportUseCase,
    private readonly ProfitTypeRoomReportUseCase: ProfitTypeRoomReportUseCase,
    private readonly balanceReportUseCase: BalanceReportUseCase, // si lo necesitas
    private readonly occupancyReportUseCase: OccupancyReportUseCase,
  ) {}

  /**
   * Genera y retorna un Excel con los datos de profit (ganancias) del rango de fechas indicado.
   * @param startDate Fecha de inicio (YYYY-MM-DD)
   * @param endDate Fecha de fin (YYYY-MM-DD)
   * @returns ExcelJS.Workbook con los datos de profit
   */
  async getProfitExcel({
    startDate,
    endDate,
  }: {
    startDate: string;
    endDate: string;
  }) {
    const data = await this.reportsRepository.getProfit(startDate, endDate);
    return this.profitReportUseCase.execute(data, { startDate, endDate });
  }

  /**
   * Genera y retorna un Excel con los datos de expense (gastos) del rango de fechas indicado.
   * @param startDate Fecha de inicio (YYYY-MM-DD)
   * @param endDate Fecha de fin (YYYY-MM-DD)
   * @returns ExcelJS.Workbook con los datos de expense
   */
  async getExpenseExcel({
    startDate,
    endDate,
  }: {
    startDate: string;
    endDate: string;
  }) {
    const data = await this.reportsRepository.getExpense(startDate, endDate);
    return this.expenseReportUseCase.execute(data, { startDate, endDate });
  }

  /**
   * Genera y retorna un Excel con los datos de balance (profit y expense) del rango de fechas indicado.
   * @param startDate Fecha de inicio (YYYY-MM-DD)
   * @param endDate Fecha de fin (YYYY-MM-DD)
   * @returns ExcelJS.Workbook con los datos de balance
   */
  async getBalanceExcel({
    startDate,
    endDate,
  }: {
    startDate: string;
    endDate: string;
  }) {
    const balanceData = await this.reportsRepository.getBalance(
      startDate,
      endDate,
    );
    return this.balanceReportUseCase.execute(balanceData, {
      startDate,
      endDate,
    });
  }

  /**
   * Genera y retorna un Excel con los datos de ganancia por habitación del rango de fechas indicado.
   * @param startDate Fecha de inicio (YYYY-MM-DD)
   * @param endDate Fecha de fin (YYYY-MM-DD)
   * @param typeRoomId ID del tipo de habitación
   * @returns ExcelJS.Workbook con los datos de balance
   */
  async getProfitTypeRoomExcel({
    startDate,
    endDate,
    typeRoomId,
  }: {
    startDate: string;
    endDate: string;
    typeRoomId: string;
  }) {
    const data = await this.reportsRepository.getProfitTypeRoom(
      startDate,
      endDate,
      typeRoomId,
    );
    return this.ProfitTypeRoomReportUseCase.execute(data, {
      startDate,
      endDate,
    });
  }

  /**
   * Obtiene los datos de estadísticas de ocupación por tipo de habitación
   * @param startDate Fecha de inicio (YYYY-MM-DD)
   * @param endDate Fecha de fin (YYYY-MM-DD)
   * @returns Estadísticas detalladas de ocupación
   */
  async getOccupancyData(
    startDate: string,
    endDate: string,
  ): Promise<OccupancyStatsResponse> {
    return this.reportsRepository.getOccupancyStatsByRoomType(
      startDate,
      endDate,
    );
  }

  /**
   * Genera un Excel con estadísticas de ocupación por tipo de habitación
   * @param params Objeto con startDate y endDate
   * @returns Workbook de ExcelJS listo para descargar
   */
  async getOccupancyExcel({
    startDate,
    endDate,
  }: {
    startDate: string;
    endDate: string;
  }) {
    const occupancyStats = await this.getOccupancyData(startDate, endDate);
    return this.occupancyReportUseCase.execute(occupancyStats, {
      startDate,
      endDate,
    });
  }

  // ========== MÉTODOS COMPARATIVOS ==========

  /**
   * Genera y retorna un Excel comparativo con los datos de profit entre dos años
   * @param year1 Primer año a comparar
   * @param year2 Segundo año a comparar
   * @returns ExcelJS.Workbook con los datos comparativos de profit
   */
  async getProfitCompareExcel({
    year1,
    year2,
  }: {
    year1: number;
    year2: number;
  }) {
    const startDate1 = `${year1}-01-01`;
    const endDate1 = `${year1}-12-31`;
    const startDate2 = `${year2}-01-01`;
    const endDate2 = `${year2}-12-31`;

    const [data1, data2] = await Promise.all([
      this.reportsRepository.getProfit(startDate1, endDate1),
      this.reportsRepository.getProfit(startDate2, endDate2),
    ]);

    return this.profitReportUseCase.executeCompare(data1, data2, {
      year1,
      year2,
    });
  }

  /**
   * Genera y retorna un Excel comparativo con los datos de expense entre dos años
   * @param year1 Primer año a comparar
   * @param year2 Segundo año a comparar
   * @returns ExcelJS.Workbook con los datos comparativos de expense
   */
  async getExpenseCompareExcel({
    year1,
    year2,
  }: {
    year1: number;
    year2: number;
  }) {
    const startDate1 = `${year1}-01-01`;
    const endDate1 = `${year1}-12-31`;
    const startDate2 = `${year2}-01-01`;
    const endDate2 = `${year2}-12-31`;

    const [data1, data2] = await Promise.all([
      this.reportsRepository.getExpense(startDate1, endDate1),
      this.reportsRepository.getExpense(startDate2, endDate2),
    ]);

    return this.expenseReportUseCase.executeCompare(data1, data2, {
      year1,
      year2,
    });
  }

  /**
   * Genera y retorna un Excel comparativo con los datos de balance entre dos años
   * @param year1 Primer año a comparar
   * @param year2 Segundo año a comparar
   * @returns ExcelJS.Workbook con los datos comparativos de balance
   */
  async getBalanceCompareExcel({
    year1,
    year2,
  }: {
    year1: number;
    year2: number;
  }) {
    const startDate1 = `${year1}-01-01`;
    const endDate1 = `${year1}-12-31`;
    const startDate2 = `${year2}-01-01`;
    const endDate2 = `${year2}-12-31`;

    const [data1, data2] = await Promise.all([
      this.reportsRepository.getBalance(startDate1, endDate1),
      this.reportsRepository.getBalance(startDate2, endDate2),
    ]);

    return this.balanceReportUseCase.executeCompare(data1, data2, {
      year1,
      year2,
    });
  }

  /**
   * Genera y retorna un Excel comparativo con los datos de ganancia por habitación entre dos años
   * @param year1 Primer año a comparar
   * @param year2 Segundo año a comparar
   * @param typeRoomId ID del tipo de habitación
   * @returns ExcelJS.Workbook con los datos comparativos de profit por tipo de habitación
   */
  async getProfitTypeRoomCompareExcel({
    year1,
    year2,
    typeRoomId,
  }: {
    year1: number;
    year2: number;
    typeRoomId: string;
  }) {
    const startDate1 = `${year1}-01-01`;
    const endDate1 = `${year1}-12-31`;
    const startDate2 = `${year2}-01-01`;
    const endDate2 = `${year2}-12-31`;

    const [data1, data2] = await Promise.all([
      this.reportsRepository.getProfitTypeRoom(
        startDate1,
        endDate1,
        typeRoomId,
      ),
      this.reportsRepository.getProfitTypeRoom(
        startDate2,
        endDate2,
        typeRoomId,
      ),
    ]);

    return this.ProfitTypeRoomReportUseCase.executeCompare(data1, data2, {
      year1,
      year2,
    });
  }

  /**
   * Genera y retorna un Excel comparativo con estadísticas de ocupación entre dos años
   * @param year1 Primer año a comparar
   * @param year2 Segundo año a comparar
   * @returns ExcelJS.Workbook con los datos comparativos de ocupación
   */
  async getOccupancyCompareExcel({
    year1,
    year2,
  }: {
    year1: number;
    year2: number;
  }) {
    const startDate1 = `${year1}-01-01`;
    const endDate1 = `${year1}-12-31`;
    const startDate2 = `${year2}-01-01`;
    const endDate2 = `${year2}-12-31`;

    const [data1, data2] = await Promise.all([
      this.getOccupancyData(startDate1, endDate1),
      this.getOccupancyData(startDate2, endDate2),
    ]);

    return this.occupancyReportUseCase.executeCompare(data1, data2, {
      year1,
      year2,
    });
  }
}
