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
    sheet.mergeCells('A1:H1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = title;
    titleCell.font = { bold: true, size: 14 };
    titleCell.alignment = { horizontal: 'center' };

    // -- Encabezados de columnas (actualizados) --
    const headers = [
      'Fecha',
      'Mov. Boleta S/',
      'Mov. Factura S/',
      'Mov. Otro S/',
      'Total Movimientos S/', // Nueva columna
      'Gast. Boleta S/',
      'Gast. Factura S/',
      'Gast. Otro S/',
      'Total Gastos S/', // Nueva columna
      'Monto Total S/',
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

    // -- Generar días del mes completo --
    const diasEnMes = new Date(year, month, 0).getDate();

    // Crear un mapa con los datos existentes para búsqueda rápida
    const dataMap: Record<string, ExpenseData> = {};
    data.forEach((item) => {
      dataMap[item.date] = item;
    });

    // -- Agregar los datos para cada día del mes --
    let totalGeneral = 0;
    let totalMovBoleta = 0;
    let totalMovFactura = 0;
    let totalMovOtro = 0;
    let totalMovimientos = 0; // Nueva variable
    let totalGastBoleta = 0;
    let totalGastFactura = 0;
    let totalGastOtro = 0;
    let totalGastos = 0; // Nueva variable

    for (let dia = 1; dia <= diasEnMes; dia++) {
      const fechaStr = `${year}-${month.toString().padStart(2, '0')}-${dia.toString().padStart(2, '0')}`;
      const item = dataMap[fechaStr] || {
        date: fechaStr,
        amount: 0,
        movimientosBoleta: 0,
        movimientosFactura: 0,
        movimientosOtro: 0,
        totalMovimientos: 0, // Nueva propiedad
        gastosBoleta: 0,
        gastosFactura: 0,
        gastosOtro: 0,
        totalGastos: 0, // Nueva propiedad
      };

      sheet.addRow([
        item.date,
        item.movimientosBoleta,
        item.movimientosFactura,
        item.movimientosOtro,
        item.totalMovimientos, // Nueva columna
        item.gastosBoleta,
        item.gastosFactura,
        item.gastosOtro,
        item.totalGastos, // Nueva columna
        item.amount,
      ]);

      totalGeneral += item.amount;
      totalMovBoleta += item.movimientosBoleta;
      totalMovFactura += item.movimientosFactura;
      totalMovOtro += item.movimientosOtro;
      totalMovimientos += item.totalMovimientos; // Acumular total movimientos
      totalGastBoleta += item.gastosBoleta;
      totalGastFactura += item.gastosFactura;
      totalGastOtro += item.gastosOtro;
      totalGastos += item.totalGastos; // Acumular total gastos
    }

    // -- Fila de total --
    const totalRow = sheet.addRow([
      'TOTAL',
      totalMovBoleta,
      totalMovFactura,
      totalMovOtro,
      totalMovimientos, // Nueva columna
      totalGastBoleta,
      totalGastFactura,
      totalGastOtro,
      totalGastos, // Nueva columna
      totalGeneral,
    ]);
    totalRow.font = { bold: true };

    // Aplicar estilo a la celda del total general
    const totalGeneralCell = sheet.getCell(`J${totalRow.number}`);
    totalGeneralCell.font = { bold: true, color: { argb: 'FF0000FF' } };
    totalGeneralCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFEEEEEE' },
    };

    // -- Formato de moneda para todas las celdas numéricas --
    for (let i = 4; i <= sheet.rowCount; i++) {
      for (let j = 2; j <= 10; j++) {
        // Columnas B-J son montos
        const cell = sheet.getCell(i, j);
        cell.numFmt = '"S/ "#,##0.00';
      }
    }

    // -- Ajustar ancho de columnas --
    sheet.columns = headers.map(() => ({ width: 18 }));

    // Formato especial para la columna fecha
    sheet.getColumn(1).width = 15;
    sheet.getColumn(1).alignment = { horizontal: 'center' };

    return workbook;
  }
}
