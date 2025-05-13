import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { BalanceData } from '../interfaces/balance';

@Injectable()
export class BalanceReportUseCase {
  async execute(
    data: BalanceData,
    { month, year }: { month: number; year: number },
  ): Promise<ExcelJS.Workbook> {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Balance');

    // -- Título principal --
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
    const title = `Balance de Ganancias y Gastos - ${monthNames[month]} ${year}`;
    sheet.mergeCells('A1:H1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = title;
    titleCell.font = { bold: true, size: 14 };
    titleCell.alignment = { horizontal: 'center' };

    // -- Encabezados --
    const headers = [
      'Fecha Ganancia',
      'Total Reservas S/',
      'Total Extra Service S/',
      'Total Ganancia S/',
      '', // Separador visual
      'Fecha Gasto',
      'Monto Gasto S/',
      'Descripción Gasto',
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

    // -- Determinar el máximo de filas --
    const maxRows = Math.max(data.profit.length, data.expense.length);

    // -- Agregar los datos lado a lado --
    let totalGanancia = 0;
    let totalExtras = 0;
    let totalGananciaGeneral = 0;
    let totalGasto = 0;

    for (let i = 0; i < maxRows; i++) {
      const profit = data.profit[i];
      const expense = data.expense[i];

      sheet.addRow([
        profit?.date ?? '',
        profit?.totalReservas ?? '',
        profit?.totalExtras ?? '',
        profit?.total ?? '',
        '', // Separador visual
        expense?.date ?? '',
        expense?.amount ?? '',
        expense?.description ?? '',
      ]);

      if (profit) {
        totalGanancia += profit.totalReservas;
        totalExtras += profit.totalExtras;
        totalGananciaGeneral += profit.total;
      }
      if (expense) {
        totalGasto += expense.amount;
      }
    }

    // -- Fila de totales --
    const totalRow = sheet.addRow([
      'TOTALES',
      totalGanancia,
      totalExtras,
      totalGananciaGeneral,
      '',
      '',
      totalGasto,
      '',
    ]);
    totalRow.font = { bold: true };

    // -- Dos filas vacías antes del resumen de balance --
    sheet.addRow([]);
    sheet.addRow([]);

    // -- Cabecera de resumen de balance (mover a la derecha, por ejemplo de D a H) --
    const resumenTitle = `RESUMEN DE BALANCE - ${monthNames[month]} ${year}`;
    const resumenRowNumber = sheet.lastRow.number + 1;
    sheet.mergeCells(`D${resumenRowNumber}:H${resumenRowNumber}`);
    const resumenHeader = sheet.addRow(['', '', '', resumenTitle]);
    const resumenHeaderCell = sheet.getCell(`D${resumenHeader.number}`);
    resumenHeaderCell.font = { bold: true, size: 14 };
    resumenHeaderCell.alignment = { horizontal: 'center' };

    // -- Detalle de totales y balance --
    sheet.addRow(['Total Ganancia Reservas', totalGanancia]);
    sheet.addRow(['Total Ganancia Servicios Extra', totalExtras]);
    sheet.addRow(['Total Ganancia General', totalGananciaGeneral]);
    sheet.addRow(['Total Gastos', totalGasto]);

    // -- Fila con la fórmula explícita --
    const formulaRow = sheet.addRow([
      '',
      '',
      '',
      '',
      '',
      '',
      'Balance = Total Ganancia General - Total Gastos',
      '',
    ]);
    formulaRow.font = { italic: true, color: { argb: 'FF555555' } };

    // -- Fila del balance real --
    const balanceReal = totalGananciaGeneral - totalGasto;
    const balanceRow = sheet.addRow([
      '',
      '',
      '',
      '',
      '',
      '',
      'TOTAL BALANCE DEL MES',
      balanceReal,
    ]);
    balanceRow.font = {
      bold: true,
      color: { argb: balanceReal >= 0 ? 'FF008000' : 'FFFF0000' },
    };

    // -- Ajustar ancho de columnas --
    sheet.columns = headers.map(() => ({ width: 22 }));

    return workbook;
  }
}
