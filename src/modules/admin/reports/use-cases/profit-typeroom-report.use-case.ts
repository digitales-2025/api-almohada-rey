import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { ProfitRoomTypeData } from '../interfaces/profit-roomtype-fields';
import { colors } from 'src/utils/colors/colors.utils';

@Injectable()
export class ProfitTypeRoomReportUseCase {
  async execute(
    data: ProfitRoomTypeData[],
    { startDate, endDate }: { startDate: string; endDate: string },
  ): Promise<ExcelJS.Workbook> {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Ganancias');

    // -- Cabecera/Título con mes y año --
    const title = `Reporte de Ganancias - ${startDate} a ${endDate}`;
    sheet.mergeCells('A1:F1');
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
      'Tipo de Ingreso',
      'Habitación',
      'Total Habitación S/',
      'Total Extras S/',
      'Total General S/',
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

    // -- Agregar los datos --
    let totalHabitacion = 0;
    let totalExtras = 0;
    let totalGeneral = 0;
    data.forEach((item) => {
      sheet.addRow([
        item.date,
        item.tipoIngreso,
        item.habitacion,
        item.totalHabitacion,
        item.totalExtras,
        item.totalGeneral,
      ]);
      totalHabitacion += item.totalHabitacion;
      totalExtras += item.totalExtras;
      totalGeneral += item.totalGeneral;
    });

    // -- Fila de total --
    const totalRow = sheet.addRow([
      '',
      '',
      'TOTAL',
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
    const totalGeneralCell = sheet.getCell(`F${totalRow.number}`);
    totalGeneralCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: `FF${colors.SUCCESS}` },
    };

    // -- Ajustar ancho de columnas --
    sheet.columns = headers.map(() => ({ width: 22 }));

    return workbook;
  }

  /**
   * Genera un reporte comparativo de ganancias por tipo de habitación entre dos años
   * @param data1 Datos del primer año
   * @param data2 Datos del segundo año
   * @param years Años a comparar
   * @returns Workbook con 3 hojas: Resumen Comparativo, Detalle Año 1, Detalle Año 2
   */
  async executeCompare(
    data1: ProfitRoomTypeData[],
    data2: ProfitRoomTypeData[],
    { year1, year2 }: { year1: number; year2: number },
  ): Promise<ExcelJS.Workbook> {
    const workbook = new ExcelJS.Workbook();

    // Hoja 1: Resumen Comparativo
    const summarySheet = workbook.addWorksheet('Resumen Comparativo');
    this.createProfitTypeRoomComparisonSummary(
      summarySheet,
      data1,
      data2,
      year1,
      year2,
    );

    // Hoja 2: Detalle Año 1
    const detailSheet1 = workbook.addWorksheet(`Detalle ${year1}`);
    this.createProfitTypeRoomDetailSheet(detailSheet1, data1, year1);

    // Hoja 3: Detalle Año 2
    const detailSheet2 = workbook.addWorksheet(`Detalle ${year2}`);
    this.createProfitTypeRoomDetailSheet(detailSheet2, data2, year2);

    return workbook;
  }

  private createProfitTypeRoomComparisonSummary(
    sheet: ExcelJS.Worksheet,
    data1: ProfitRoomTypeData[],
    data2: ProfitRoomTypeData[],
    year1: number,
    year2: number,
  ) {
    // Título principal
    sheet.mergeCells('A1:F1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = `Reporte Comparativo de Ganancias por Tipo de Habitación - ${year1} vs ${year2}`;
    titleCell.font = { size: 16, bold: true, color: { argb: colors.PRIMARY } };
    titleCell.alignment = { horizontal: 'center' };

    // Subtítulo
    sheet.mergeCells('A2:F2');
    const subtitleCell = sheet.getCell('A2');
    subtitleCell.value =
      'Análisis comparativo de ingresos por tipo de habitación';
    subtitleCell.font = { size: 12, italic: true };
    subtitleCell.alignment = { horizontal: 'center' };

    // Espacio
    sheet.getRow(3).height = 20;

    // Encabezados de la tabla comparativa
    const headers = [
      'Tipo de Habitación',
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

    // Calcular totales por tipo de habitación
    const roomTypes = this.getUniqueRoomTypes(data1, data2);
    let currentRow = 5;

    roomTypes.forEach((roomType) => {
      const amount1 = this.getTotalByRoomType(data1, roomType);
      const amount2 = this.getTotalByRoomType(data2, roomType);
      const difference = amount1 - amount2;
      const variation = amount2 !== 0 ? (difference / amount2) * 100 : 0;
      const trend = this.getTrendIcon(variation);

      const row = sheet.getRow(currentRow);
      row.getCell(1).value = roomType;
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
      { width: 30 }, // Tipo de Habitación
      { width: 15 }, // Año 1
      { width: 15 }, // Año 2
      { width: 15 }, // Diferencia
      { width: 12 }, // Variación
      { width: 10 }, // Tendencia
    ];
  }

  private createProfitTypeRoomDetailSheet(
    sheet: ExcelJS.Worksheet,
    data: ProfitRoomTypeData[],
    year: number,
  ) {
    // Título
    sheet.mergeCells('A1:F1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = `Reporte de Ganancias por Tipo de Habitación - ${year}`;
    titleCell.font = { size: 16, bold: true, color: { argb: colors.PRIMARY } };
    titleCell.alignment = { horizontal: 'center' };

    // Espacio
    sheet.getRow(2).height = 20;

    // Encabezados
    const headers = [
      'Fecha',
      'Tipo de Habitación',
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
      row.getCell(2).value = item.habitacion;
      row.getCell(3).value =
        `${item.tipoIngreso} - Habitación: ${item.totalHabitacion}, Extras: ${item.totalExtras}`;
      row.getCell(4).value = 1; // Cantidad fija
      row.getCell(5).value = item.totalGeneral;
      row.getCell(6).value = item.totalGeneral;

      // Formatear números
      row.getCell(4).numFmt = '#,##0';
      row.getCell(5).numFmt = '#,##0.00';
      row.getCell(6).numFmt = '#,##0.00';

      currentRow++;
    });

    // Ajustar ancho de columnas
    sheet.columns = [
      { width: 12 }, // Fecha
      { width: 25 }, // Tipo de Habitación
      { width: 30 }, // Descripción
      { width: 12 }, // Cantidad
      { width: 15 }, // Precio Unit.
      { width: 15 }, // Total
    ];
  }

  private getUniqueRoomTypes(
    data1: ProfitRoomTypeData[],
    data2: ProfitRoomTypeData[],
  ): string[] {
    const roomTypes = new Set<string>();
    data1.forEach((item) => roomTypes.add(item.habitacion));
    data2.forEach((item) => roomTypes.add(item.habitacion));
    return Array.from(roomTypes).sort();
  }

  private getTotalByRoomType(
    data: ProfitRoomTypeData[],
    roomType: string,
  ): number {
    return data
      .filter((item) => item.habitacion === roomType)
      .reduce((sum, item) => sum + item.totalGeneral, 0);
  }

  private getTotalAmount(data: ProfitRoomTypeData[]): number {
    return data.reduce((sum, item) => sum + item.totalGeneral, 0);
  }

  private getTrendIcon(variation: number): string {
    if (variation > 5) return '📈';
    if (variation < -5) return '📉';
    return '➡️';
  }
}
