import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { ExpenseData } from '../interfaces/expense-fields';
import { colors } from 'src/utils/colors/colors.utils';

@Injectable()
export class ExpenseReportUseCase {
  async execute(
    data: ExpenseData[],
    { startDate, endDate }: { startDate: string; endDate: string },
  ): Promise<ExcelJS.Workbook> {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Expense');

    // -- Cabecera/Título con mes y año --
    const title = `Reporte de Gastos - ${startDate} a ${endDate}`;
    sheet.mergeCells('A1:J1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = title;
    titleCell.font = {
      bold: true,
      size: 14,
      color: { argb: colors.headerText },
    };
    titleCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: colors.titleBg },
    };
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
      cell.font = {
        bold: true,
        color: { argb: colors.headerText },
      };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: colors.headerBg },
      };
      cell.border = {
        top: { style: 'thin', color: { argb: colors.borderColor } },
        left: { style: 'thin', color: { argb: colors.borderColor } },
        bottom: { style: 'thin', color: { argb: colors.borderColor } },
        right: { style: 'thin', color: { argb: colors.borderColor } },
      };
    });

    // -- Generar días del rango de fechas --
    const start = new Date(startDate + 'T00:00:00');
    const end = new Date(endDate + 'T00:00:00');
    const current = new Date(start);

    // Crear un mapa con los datos existentes para búsqueda rápida
    const dataMap: Record<string, ExpenseData> = {};
    data.forEach((item) => {
      dataMap[item.date] = item;
    });

    // -- Agregar los datos para cada día del rango --
    let totalGeneral = 0;
    let totalMovBoleta = 0;
    let totalMovFactura = 0;
    let totalMovOtro = 0;
    let totalMovimientos = 0; // Nueva variable
    let totalGastBoleta = 0;
    let totalGastFactura = 0;
    let totalGastOtro = 0;
    let totalGastos = 0; // Nueva variable

    let currentMonth = null;
    const monthNames = [
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

    while (current <= end) {
      const fechaStr = current.toISOString().split('T')[0];
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

      // Verificar si cambió el mes
      const month = current.getMonth();
      const year = current.getFullYear();

      if (currentMonth !== month) {
        // Si no es el primer mes, agregar totales del mes anterior
        if (currentMonth !== null) {
          this.addMonthTotals(sheet, monthNames[currentMonth]);
        }

        // Agregar separador de mes
        const monthRow = sheet.addRow([]);
        const monthCell = sheet.getCell(`A${monthRow.number}`);
        monthCell.value = monthNames[month] + ' ' + year;
        monthCell.font = {
          bold: true,
          size: 12,
          color: { argb: colors.PRIMARY },
        };
        monthCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF0F0F0' },
        };
        monthCell.alignment = { horizontal: 'center' };

        // Mergear celdas para el separador de mes
        sheet.mergeCells(`A${monthRow.number}:J${monthRow.number}`);

        currentMonth = month;
      }

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

      // Avanzar al siguiente día
      current.setDate(current.getDate() + 1);
    }

    // Agregar totales del último mes
    if (currentMonth !== null) {
      this.addMonthTotals(sheet, monthNames[currentMonth]);
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

    // Aplicar estilo corporativo a toda la fila de totales
    totalRow.eachCell((cell) => {
      cell.font = {
        bold: true,
        color: { argb: colors.headerText },
      };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: colors.totalsBg },
      };
      cell.border = {
        top: { style: 'thin', color: { argb: colors.borderColor } },
        left: { style: 'thin', color: { argb: colors.borderColor } },
        bottom: { style: 'thin', color: { argb: colors.borderColor } },
        right: { style: 'thin', color: { argb: colors.borderColor } },
      };
    });

    // Aplicar estilo especial a la celda del total general
    const totalGeneralCell = sheet.getCell(`J${totalRow.number}`);
    totalGeneralCell.font = {
      bold: true,
      color: { argb: colors.headerText },
    };
    totalGeneralCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: `FF${colors.WARNING}` },
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

  /**
   * Genera un reporte comparativo de gastos entre dos años
   * @param data1 Datos del primer año
   * @param data2 Datos del segundo año
   * @param years Años a comparar
   * @returns Workbook con 3 hojas: Resumen Comparativo, Detalle Año 1, Detalle Año 2
   */
  async executeCompare(
    data1: ExpenseData[],
    data2: ExpenseData[],
    { year1, year2 }: { year1: number; year2: number },
  ): Promise<ExcelJS.Workbook> {
    const workbook = new ExcelJS.Workbook();

    // Hoja 1: Resumen Comparativo
    const summarySheet = workbook.addWorksheet('Resumen Comparativo');
    this.createExpenseComparisonSummary(
      summarySheet,
      data1,
      data2,
      year1,
      year2,
    );

    // Hoja 2: Detalle Año 1
    const detailSheet1 = workbook.addWorksheet(`Detalle ${year1}`);
    this.createExpenseDetailSheet(detailSheet1, data1, year1);

    // Hoja 3: Detalle Año 2
    const detailSheet2 = workbook.addWorksheet(`Detalle ${year2}`);
    this.createExpenseDetailSheet(detailSheet2, data2, year2);

    return workbook;
  }

  private createExpenseComparisonSummary(
    sheet: ExcelJS.Worksheet,
    data1: ExpenseData[],
    data2: ExpenseData[],
    year1: number,
    year2: number,
  ) {
    // Título principal
    sheet.mergeCells('A1:F1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = `Reporte Comparativo de Gastos - ${year1} vs ${year2}`;
    titleCell.font = { size: 16, bold: true, color: { argb: colors.PRIMARY } };
    titleCell.alignment = { horizontal: 'center' };

    // Subtítulo
    sheet.mergeCells('A2:F2');
    const subtitleCell = sheet.getCell('A2');
    subtitleCell.value = 'Análisis comparativo de gastos por categoría';
    subtitleCell.font = { size: 12, italic: true };
    subtitleCell.alignment = { horizontal: 'center' };

    // Espacio
    sheet.getRow(3).height = 20;

    // Encabezados de la tabla comparativa
    const headers = [
      'Categoría',
      `${year1} (S/)`,
      `${year2} (S/)`,
      'Diferencia (S/)',
      'Variación (%)',
      'Tendencia',
    ];

    const headerRow = sheet.getRow(4);
    headers.forEach((header, index) => {
      const cell = headerRow.getCell(index + 1);
      cell.value = header;
      cell.font = { bold: true, color: { argb: 'FFFFFF' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: colors.PRIMARY },
      };
      cell.alignment = { horizontal: 'center' };
    });

    // Calcular totales por categoría
    const categories = this.getUniqueCategories(data1, data2);
    let currentRow = 5;

    categories.forEach((category) => {
      const amount1 = this.getTotalByCategory(data1, category);
      const amount2 = this.getTotalByCategory(data2, category);
      const difference = amount1 - amount2;
      const variation = amount2 !== 0 ? (difference / amount2) * 100 : 0;
      const trend = this.getTrendIcon(variation);

      const row = sheet.getRow(currentRow);
      row.getCell(1).value = category;
      row.getCell(2).value = amount1;
      row.getCell(3).value = amount2;
      row.getCell(4).value = difference;
      row.getCell(5).value = variation;
      row.getCell(6).value = trend;

      // Formatear números
      row.getCell(2).numFmt = '#,##0.00';
      row.getCell(3).numFmt = '#,##0.00';
      row.getCell(4).numFmt = '#,##0.00';
      row.getCell(5).numFmt = '0.00"%"';

      // Colorear según tendencia (invertido para gastos)
      if (variation > 0) {
        row.getCell(4).font = { color: { argb: 'AA0000' } }; // Rojo para aumento de gastos
        row.getCell(5).font = { color: { argb: 'AA0000' } };
      } else if (variation < 0) {
        row.getCell(4).font = { color: { argb: '00AA00' } }; // Verde para reducción de gastos
        row.getCell(5).font = { color: { argb: '00AA00' } };
      }

      currentRow++;
    });

    // Fila de totales
    const totalRow = sheet.getRow(currentRow);
    const total1 = this.getTotalAmount(data1);
    const total2 = this.getTotalAmount(data2);
    const totalDiff = total1 - total2;
    const totalVariation = total2 !== 0 ? (totalDiff / total2) * 100 : 0;

    totalRow.getCell(1).value = 'TOTAL';
    totalRow.getCell(1).font = { bold: true };
    totalRow.getCell(2).value = total1;
    totalRow.getCell(3).value = total2;
    totalRow.getCell(4).value = totalDiff;
    totalRow.getCell(5).value = totalVariation;
    totalRow.getCell(6).value = this.getTrendIcon(totalVariation);

    // Formatear totales
    totalRow.getCell(2).numFmt = '#,##0.00';
    totalRow.getCell(3).numFmt = '#,##0.00';
    totalRow.getCell(4).numFmt = '#,##0.00';
    totalRow.getCell(5).numFmt = '0.00"%"';

    // Estilo de la fila de totales
    totalRow.eachCell((cell) => {
      cell.font = { bold: true };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'F0F0F0' },
      };
    });

    // Ajustar ancho de columnas
    sheet.columns = [
      { width: 25 }, // Categoría
      { width: 15 }, // Año 1
      { width: 15 }, // Año 2
      { width: 15 }, // Diferencia
      { width: 12 }, // Variación
      { width: 10 }, // Tendencia
    ];
  }

  private createExpenseDetailSheet(
    sheet: ExcelJS.Worksheet,
    data: ExpenseData[],
    year: number,
  ) {
    // Título
    sheet.mergeCells('A1:F1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = `Reporte de Gastos - ${year}`;
    titleCell.font = { size: 16, bold: true, color: { argb: colors.PRIMARY } };
    titleCell.alignment = { horizontal: 'center' };

    // Espacio
    sheet.getRow(2).height = 20;

    // Encabezados
    const headers = [
      'Fecha',
      'Categoría',
      'Descripción',
      'Cantidad',
      'Precio Unit.',
      'Total',
    ];
    const headerRow = sheet.getRow(3);
    headers.forEach((header, index) => {
      const cell = headerRow.getCell(index + 1);
      cell.value = header;
      cell.font = { bold: true, color: { argb: 'FFFFFF' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: colors.PRIMARY },
      };
      cell.alignment = { horizontal: 'center' };
    });

    // Datos
    let currentRow = 4;
    data.forEach((item) => {
      const row = sheet.getRow(currentRow);
      row.getCell(1).value = item.date;
      row.getCell(2).value = item.category || 'Sin categoría';
      row.getCell(3).value = item.description || 'Sin descripción';
      row.getCell(4).value = 1; // Cantidad fija para gastos
      row.getCell(5).value = item.amount;
      row.getCell(6).value = item.amount;

      // Formatear números
      row.getCell(4).numFmt = '#,##0';
      row.getCell(5).numFmt = '#,##0.00';
      row.getCell(6).numFmt = '#,##0.00';

      currentRow++;
    });

    // Ajustar ancho de columnas
    sheet.columns = [
      { width: 12 }, // Fecha
      { width: 20 }, // Categoría
      { width: 30 }, // Descripción
      { width: 12 }, // Cantidad
      { width: 15 }, // Precio Unit.
      { width: 15 }, // Total
    ];
  }

  private getUniqueCategories(
    data1: ExpenseData[],
    data2: ExpenseData[],
  ): string[] {
    const categories = new Set<string>();
    data1.forEach((item) => categories.add(item.category));
    data2.forEach((item) => categories.add(item.category));
    return Array.from(categories).sort();
  }

  private getTotalByCategory(data: ExpenseData[], category: string): number {
    return data
      .filter((item) => item.category === category)
      .reduce((sum, item) => sum + item.amount, 0);
  }

  private getTotalAmount(data: ExpenseData[]): number {
    return data.reduce((sum, item) => sum + item.amount, 0);
  }

  private getTrendIcon(variation: number): string {
    if (variation > 5) return '📈';
    if (variation < -5) return '📉';
    return '➡️';
  }

  private addMonthTotals(sheet: ExcelJS.Worksheet, monthName: string) {
    // Agregar fila de totales del mes
    const totalRow = sheet.addRow(['TOTAL ' + monthName.toUpperCase()]);

    // Mergear celdas para el total del mes
    sheet.mergeCells(`A${totalRow.number}:J${totalRow.number}`);

    // Estilo para el total del mes
    const totalCell = sheet.getCell(`A${totalRow.number}`);
    totalCell.font = { bold: true, size: 11, color: { argb: colors.PRIMARY } };
    totalCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE8E8E8' },
    };
    totalCell.alignment = { horizontal: 'center' };

    // Agregar fila vacía para separación
    sheet.addRow([]);
  }
}
