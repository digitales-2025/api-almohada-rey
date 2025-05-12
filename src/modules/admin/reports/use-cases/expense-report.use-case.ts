import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { ExpenseData } from '../interfaces/expense-fields';

@Injectable()
export class ExpenseReportUseCase {
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
    sheet.mergeCells('A1:G1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = title;
    titleCell.font = { bold: true, size: 14 };
    titleCell.alignment = { horizontal: 'center' };

    // -- Encabezados de columnas --
    const headers = [
      'Fecha Gasto',
      'Tipo Gasto',
      'Descripción',
      'Categoría Gasto',
      'Método de Pago',
      'Monto S/',
      'Nro.Documento',
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

    // -- Agregar los datos --
    let total = 0;
    data.forEach((item) => {
      sheet.addRow([
        item.date,
        item.type === 'INVENTORY_INPUT' ? 'Inventario' : 'Gasto Hotel',
        item.description,
        item.category,
        item.paymentMethod,
        item.amount,
        `${item.documentType ?? ''} ${item.documentNumber ?? ''}`,
      ]);
      total += item.amount;
    });

    // -- Fila de total --
    const totalRow = sheet.addRow(['', '', '', '', 'TOTAL', total, '']);
    totalRow.font = { bold: true };

    // -- Ajustar ancho de columnas --
    sheet.columns = headers.map(() => ({ width: 22 }));

    return workbook;
  }
}
