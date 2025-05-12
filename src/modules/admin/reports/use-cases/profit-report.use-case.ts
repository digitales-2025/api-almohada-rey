import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { ProfitData } from '../interfaces/profit-fields';

@Injectable()
export class ProfitReportUseCase {
  async execute(
    data: ProfitData[],
    { month, year }: { month: number; year: number },
  ): Promise<ExcelJS.Workbook> {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Ganancias');

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
    const title = `Reporte de Ganancias - ${monthNames[month]} ${year}`;
    sheet.mergeCells('A1:E1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = title;
    titleCell.font = { bold: true, size: 14 };
    titleCell.alignment = { horizontal: 'center' };

    // -- Encabezados de columnas --
    const headers = [
      'Fecha',
      'Tipo de Ingreso',
      'Habitación/Extra',
      'Monto S/',
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
        item.type === 'ROOM' ? 'Habitación' : 'Extra',
        item.type === 'ROOM' ? item.roomTypeName : item.extraName,
        item.amount,
      ]);
      total += item.amount;
    });

    // -- Fila de total --
    const totalRow = sheet.addRow(['', '', 'TOTAL', total]);
    totalRow.font = { bold: true };

    // -- Ajustar ancho de columnas --
    sheet.columns = headers.map(() => ({ width: 22 }));

    return workbook;
  }
}
