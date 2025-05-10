import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { DailyExpensesByDay, DailyExpense } from '../interfaces/expense-fields';

@Injectable()
export class ExpenseReportUseCase {
  async execute(
    data: DailyExpensesByDay,
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
    sheet.mergeCells('A1:G1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = title;
    titleCell.font = { bold: true, size: 14 };
    titleCell.alignment = { horizontal: 'center' };

    // -- Encabezados de columnas --
    const headers = [
      'Fecha',
      'Tipo',
      'Descripción',
      'Categoría',
      'Método de Pago',
      'Monto',
      'Productos/Documento',
    ];
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

    // -- Transformar DailyExpensesByDay a un array plano --
    const flatData: (DailyExpense & { date: string })[] = [];
    Object.entries(data).forEach(([date, expenses]) => {
      expenses.forEach((item) => {
        flatData.push({ ...item, date });
      });
    });

    // -- Agregar los datos --
    flatData.forEach((item) => {
      if (item.type === 'INVENTORY_INPUT') {
        sheet.addRow([
          item.date,
          'Inventario',
          item.description,
          '', // categoría no aplica
          '', // método de pago no aplica
          item.total,
          item.products.map((p) => `${p.name}: ${p.subtotal}`).join('; '),
        ]);
      } else if (item.type === 'HOTEL_EXPENSE') {
        sheet.addRow([
          item.date,
          'Gasto Hotel',
          item.description,
          item.category,
          item.paymentMethod,
          item.amount,
          `${item.documentType ?? ''} ${item.documentNumber ?? ''}`,
        ]);
      }
    });

    // -- Ajustar ancho de columnas --
    sheet.columns = headers.map(() => ({ width: 22 }));

    return workbook;
  }
}
