import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { ProfitData } from '../interfaces/profit-fields';
import { colors } from 'src/utils/colors/colors.utils';

@Injectable()
export class ProfitReportUseCase {
  async execute(
    data: ProfitData[],
    { startDate, endDate }: { startDate: string; endDate: string },
  ): Promise<ExcelJS.Workbook> {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Ganancias');

    // -- Cabecera/Título con mes y año --
    const title = `Reporte de Ganancias - ${startDate} a ${endDate}`;
    sheet.mergeCells('A1:E1');
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

    // -- Encabezados de columnas --
    const headers = [
      'Fecha',
      'Conteo Reservas',
      'Total Reservas S/',
      'Total Extra Service S/',
      'Total S/',
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
    const dataMap: Record<string, ProfitData> = {};
    data.forEach((item) => {
      dataMap[item.date] = item;
    });

    // -- Agregar los datos para cada día del rango --
    let totalHabitacion = 0;
    let totalExtras = 0;
    let totalGeneral = 0;
    let totalConteo = 0;

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
        conteo: 0,
        totalReservas: 0,
        totalExtras: 0,
        total: 0,
      };

      // Verificar si cambió el mes
      const month = current.getMonth();
      const year = current.getFullYear();

      // Debug: verificar valores
      console.log(
        `🔍 DEBUG - Fecha: ${fechaStr}, Month: ${month}, Year: ${year}, MonthName: ${monthNames[month]}, CurrentMonth: ${currentMonth}`,
      );

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
        sheet.mergeCells(`A${monthRow.number}:E${monthRow.number}`);

        currentMonth = month;
      }

      sheet.addRow([
        item.date,
        item.conteo,
        item.totalReservas,
        item.totalExtras,
        item.total,
      ]);

      totalHabitacion += item.totalReservas;
      totalExtras += item.totalExtras;
      totalGeneral += item.total;
      totalConteo += item.conteo;

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
      totalConteo,
      totalHabitacion,
      totalExtras,
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

    // Destacar el total general con color verde (ganancias positivas)
    const totalGeneralCell = sheet.getCell(`E${totalRow.number}`);
    totalGeneralCell.font = {
      bold: true,
      color: { argb: colors.headerText },
    };
    totalGeneralCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: `FF${colors.SUCCESS}` },
    };

    // -- Formato de moneda para todos los valores --
    for (let i = 4; i <= sheet.rowCount; i++) {
      // Columnas C, D, E son montos
      for (let j = 3; j <= 5; j++) {
        const cell = sheet.getCell(i, j);
        cell.numFmt = '"S/ "#,##0.00';
      }
    }

    // -- Ajustar ancho de columnas --
    sheet.columns = headers.map(() => ({ width: 20 }));

    // Formato para la columna fecha
    sheet.getColumn(1).width = 15;
    sheet.getColumn(1).alignment = { horizontal: 'center' };

    return workbook;
  }

  /**
   * Genera un reporte comparativo de ganancias entre dos años
   * @param data1 Datos del primer año
   * @param data2 Datos del segundo año
   * @param years Años a comparar
   * @returns Workbook con 3 hojas: Resumen Comparativo, Detalle Año 1, Detalle Año 2
   */
  async executeCompare(
    data1: ProfitData[],
    data2: ProfitData[],
    { year1, year2 }: { year1: number; year2: number },
  ): Promise<ExcelJS.Workbook> {
    const workbook = new ExcelJS.Workbook();

    // Hoja 1: Resumen Comparativo
    const summarySheet = workbook.addWorksheet('Resumen Comparativo');
    this.createComparisonSummary(summarySheet, data1, data2, year1, year2);

    // Hoja 2: Detalle Año 1
    const detailSheet1 = workbook.addWorksheet(`Detalle ${year1}`);
    this.createDetailSheet(detailSheet1, data1, year1);

    // Hoja 3: Detalle Año 2
    const detailSheet2 = workbook.addWorksheet(`Detalle ${year2}`);
    this.createDetailSheet(detailSheet2, data2, year2);

    return workbook;
  }

  private createComparisonSummary(
    sheet: ExcelJS.Worksheet,
    data1: ProfitData[],
    data2: ProfitData[],
    year1: number,
    year2: number,
  ) {
    // Título principal
    sheet.mergeCells('A1:F1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = `Reporte Comparativo de Ganancias - ${year1} vs ${year2}`;
    titleCell.font = { size: 16, bold: true, color: { argb: colors.PRIMARY } };
    titleCell.alignment = { horizontal: 'center' };

    // Subtítulo
    sheet.mergeCells('A2:F2');
    const subtitleCell = sheet.getCell('A2');
    subtitleCell.value = 'Análisis comparativo de ingresos por concepto';
    subtitleCell.font = { size: 12, italic: true };
    subtitleCell.alignment = { horizontal: 'center' };

    // Espacio
    sheet.getRow(3).height = 20;

    // Encabezados de la tabla comparativa
    const headers = [
      'Concepto',
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

    // Calcular totales por concepto
    const concepts = this.getUniqueConcepts();
    let currentRow = 5;

    concepts.forEach((concept) => {
      const amount1 = this.getTotalByConcept(data1);
      const amount2 = this.getTotalByConcept(data2);
      const difference = amount1 - amount2;
      const variation = amount2 !== 0 ? (difference / amount2) * 100 : 0;
      const trend = this.getTrendIcon(variation);

      const row = sheet.getRow(currentRow);
      row.getCell(1).value = concept;
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

      // Colorear según tendencia
      if (variation > 0) {
        row.getCell(4).font = { color: { argb: '00AA00' } }; // Verde para positivo
        row.getCell(5).font = { color: { argb: '00AA00' } };
      } else if (variation < 0) {
        row.getCell(4).font = { color: { argb: 'AA0000' } }; // Rojo para negativo
        row.getCell(5).font = { color: { argb: 'AA0000' } };
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
      { width: 25 }, // Concepto
      { width: 15 }, // Año 1
      { width: 15 }, // Año 2
      { width: 15 }, // Diferencia
      { width: 12 }, // Variación
      { width: 10 }, // Tendencia
    ];
  }

  private createDetailSheet(
    sheet: ExcelJS.Worksheet,
    data: ProfitData[],
    year: number,
  ) {
    // Título
    sheet.mergeCells('A1:F1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = `Reporte de Ganancias - ${year}`;
    titleCell.font = { size: 16, bold: true, color: { argb: colors.PRIMARY } };
    titleCell.alignment = { horizontal: 'center' };

    // Espacio
    sheet.getRow(2).height = 20;

    // Encabezados
    const headers = [
      'Fecha',
      'Concepto',
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
      row.getCell(2).value = 'Ingresos';
      row.getCell(3).value =
        `Reservas: ${item.totalReservas}, Extras: ${item.totalExtras}`;
      row.getCell(4).value = item.conteo;
      row.getCell(5).value = item.total / item.conteo || 0; // Promedio
      row.getCell(6).value = item.total;

      // Formatear números
      row.getCell(4).numFmt = '#,##0';
      row.getCell(5).numFmt = '#,##0.00';
      row.getCell(6).numFmt = '#,##0.00';

      currentRow++;
    });

    // Ajustar ancho de columnas
    sheet.columns = [
      { width: 12 }, // Fecha
      { width: 20 }, // Concepto
      { width: 30 }, // Descripción
      { width: 12 }, // Cantidad
      { width: 15 }, // Precio Unit.
      { width: 15 }, // Total
    ];
  }

  private getUniqueConcepts(): string[] {
    // Para profit, solo tenemos un concepto: "Ingresos"
    return ['Ingresos'];
  }

  private getTotalByConcept(data: ProfitData[]): number {
    // Para profit, siempre retornamos el total de todos los datos
    return data.reduce((sum, item) => sum + item.total, 0);
  }

  private getTotalAmount(data: ProfitData[]): number {
    return data.reduce((sum, item) => sum + item.total, 0);
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
    sheet.mergeCells(`A${totalRow.number}:E${totalRow.number}`);

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
