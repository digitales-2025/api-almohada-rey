import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { ExpenseData } from '../interfaces/expense-fields';

@Injectable()
export class ProfitReportUseCase {
  async execute(
    data: ExpenseData[],
    { month, year }: { month: number; year: number },
  ): Promise<ExcelJS.Workbook> {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Expense');

    // -- Cabecera/Título con mes y año --
    const monthNames = [
      '',
      'Enero',
      'Febrero',
      'Marzo',
      'Abril',
      'Mayo',
      'Junio',
      'Julio',
      'Agosto',
      'Septiembre',
      'Octubre',
      'Noviembre',
      'Diciembre',
    ];
    const title = `Reporte de Gastos - ${monthNames[month]} ${year}`;
    sheet.mergeCells('A1:C1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = title;
    titleCell.font = { bold: true, size: 14 };
    titleCell.alignment = { horizontal: 'center' };

    // -- Encabezados de columnas --
    const headers = ['ID', 'Monto', 'Fecha'];
    sheet.addRow([]);
    sheet.addRow(headers);

    // -- Estilo de encabezados --
    sheet.getRow(3).eachCell((cell) => {
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

    // -- Agregar los datos --
    data.forEach((item) => {
      sheet.addRow([
        item.id,
        item.amount,
        item.date instanceof Date
          ? item.date.toISOString().split('T')[0]
          : item.date,
      ]);
    });

    // -- Ajustar ancho de columnas --
    sheet.columns = headers.map(() => ({ width: 20 }));

    return workbook;
  }
}
