/* import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { BalanceData } from '../interfaces/balance';

@Injectable()
export class BalanceReportUseCase {
  async execute(
    data: BalanceData,
    { month, year }: { month: number; year: number },
  ): Promise<ExcelJS.Workbook> {
    const workbook = new ExcelJS.Workbook();

    // === Hoja de Profit ===
    const profitSheet = workbook.addWorksheet('Profit');

    // -- Cabecera/Título --
    profitSheet.mergeCells('A1:C1');
    profitSheet.getCell('A1').value = `Reporte de Ganancias - ${month}/${year}`;
    profitSheet.getCell('A1').font = { bold: true, size: 14 };
    profitSheet.getCell('A1').alignment = { horizontal: 'center' };

    // -- Encabezados de columnas --
    profitSheet.addRow([]);
    profitSheet.addRow(['ID', 'Monto', 'Fecha']);
    profitSheet.getRow(3).eachCell((cell) => {
      cell.font = { bold: true };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFD3D3D3' },
      };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });

    // -- Datos de profit --
    data.profit.forEach((item) => {
      profitSheet.addRow([
        item.id,
        item.amount,
        item.date instanceof Date
          ? item.date.toISOString().split('T')[0]
          : item.date,
      ]);
    });

    // -- Ajuste de ancho de columnas --
    profitSheet.columns = [{ width: 20 }, { width: 20 }, { width: 20 }];

    // === Hoja de Expense ===
    const expenseSheet = workbook.addWorksheet('Expense');

    // -- Cabecera/Título --
    expenseSheet.mergeCells('A1:C1');
    expenseSheet.getCell('A1').value = `Reporte de Gastos - ${month}/${year}`;
    expenseSheet.getCell('A1').font = { bold: true, size: 14 };
    expenseSheet.getCell('A1').alignment = { horizontal: 'center' };

    // -- Encabezados de columnas --
    expenseSheet.addRow([]);
    expenseSheet.addRow(['ID', 'Monto', 'Fecha']);
    expenseSheet.getRow(3).eachCell((cell) => {
      cell.font = { bold: true };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFD3D3D3' },
      };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });

    // -- Datos de expense --
    data.expense.forEach((item) => {
      expenseSheet.addRow([
        item.id,
        item.amount,
        item.date instanceof Date
          ? item.date.toISOString().split('T')[0]
          : item.date,
      ]);
    });

    // -- Ajuste de ancho de columnas --
    expenseSheet.columns = [{ width: 20 }, { width: 20 }, { width: 20 }];

    return workbook;
  }
}
 */
