// En occupancy-report.use-case.ts

import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { OccupancyStatsResponse } from '../interfaces/occupancy';

@Injectable()
export class OccupancyReportUseCase {
  async execute(
    data: OccupancyStatsResponse,
    { month, year }: { month: number; year: number },
  ): Promise<ExcelJS.Workbook> {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Estadísticas de Ocupación');

    // Nombres de los meses en español
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

    // -- Título principal --
    const title = `Estadísticas de Ocupación - ${monthNames[month]} ${year}`;
    sheet.mergeCells('A1:G1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = title;
    titleCell.font = { bold: true, size: 16 };
    titleCell.alignment = { horizontal: 'center' };

    // Añadir fila en blanco
    sheet.addRow([]);

    // -- Resumen global --
    const summaryTitle = 'RESUMEN GLOBAL';
    sheet.mergeCells('A3:G3');
    const summaryTitleCell = sheet.getCell('A3');
    summaryTitleCell.value = summaryTitle;
    summaryTitleCell.font = { bold: true, size: 14 };
    summaryTitleCell.alignment = { horizontal: 'center' };
    summaryTitleCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE6E6FF' },
    };

    sheet.addRow(['Total Arribos', data.summary.totalArrivals]);
    sheet.addRow(['Total Pernoctaciones', data.summary.totalOvernights]);
    sheet.addRow(['Total Huéspedes', data.summary.totalGuests]);
    sheet.addRow(['Países de Origen', data.summary.totalCountries]);
    sheet.addRow([
      'Departamentos (Perú)',
      data.summary.totalPeruvianDepartments,
    ]);
    sheet.addRow(['Tipos de Habitación', data.summary.totalRoomTypes]);

    // Añadir filas en blanco
    sheet.addRow([]);
    sheet.addRow([]);

    // -- Estadísticas diarias --
    const dailyStatsTitle = 'ESTADÍSTICAS DIARIAS';
    sheet.mergeCells(`A${sheet.rowCount + 1}:G${sheet.rowCount + 1}`);
    const dailyStatsTitleCell = sheet.getCell(`A${sheet.rowCount}`);
    dailyStatsTitleCell.value = dailyStatsTitle;
    dailyStatsTitleCell.font = { bold: true, size: 14 };
    dailyStatsTitleCell.alignment = { horizontal: 'center' };
    dailyStatsTitleCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFDEDEFF' },
    };

    // Encabezados para estadísticas diarias
    sheet.addRow(['Fecha', 'Arribos', 'Pernoctaciones']);

    // Aplicar estilo a los encabezados
    const dailyHeaderRow = sheet.lastRow;
    dailyHeaderRow?.eachCell((cell) => {
      cell.font = { bold: true };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFEEEEEE' },
      };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });

    // Datos diarios
    data.dailyStats.forEach((dailyStat) => {
      sheet.addRow([dailyStat.date, dailyStat.arrivals, dailyStat.overnights]);
    });

    // Añadir filas en blanco
    sheet.addRow([]);
    sheet.addRow([]);

    // -- Estadísticas por nacionalidad --
    const nationalityTitle = 'ESTADÍSTICAS POR NACIONALIDAD';
    sheet.mergeCells(`A${sheet.rowCount + 1}:G${sheet.rowCount + 1}`);
    const nationalityTitleCell = sheet.getCell(`A${sheet.rowCount}`);
    nationalityTitleCell.value = nationalityTitle;
    nationalityTitleCell.font = { bold: true, size: 14 };
    nationalityTitleCell.alignment = { horizontal: 'center' };
    nationalityTitleCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFCCE5FF' },
    };

    // Encabezados para nacionalidades
    sheet.addRow([
      'País',
      'Arribos',
      'Huéspedes',
      'Pernoctaciones',
      'Estancia Promedio (días)',
    ]);

    // Aplicar estilo a los encabezados
    const nationalityHeaderRow = sheet.lastRow;
    nationalityHeaderRow?.eachCell((cell) => {
      cell.font = { bold: true };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFEEEEEE' },
      };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });

    // Datos de nacionalidades
    data.nationalityStats.forEach((natStat) => {
      sheet.addRow([
        natStat.country,
        natStat.arrivals,
        natStat.guests,
        natStat.overnights,
        natStat.averageStayDuration,
      ]);
    });

    // Añadir filas en blanco
    sheet.addRow([]);
    sheet.addRow([]);

    // -- Estadísticas por departamento (solo Perú) --
    if (data.peruvianDepartmentStats.length > 0) {
      const departmentTitle = 'ESTADÍSTICAS POR DEPARTAMENTO (PERÚ)';
      sheet.mergeCells(`A${sheet.rowCount + 1}:G${sheet.rowCount + 1}`);
      const departmentTitleCell = sheet.getCell(`A${sheet.rowCount}`);
      departmentTitleCell.value = departmentTitle;
      departmentTitleCell.font = { bold: true, size: 14 };
      departmentTitleCell.alignment = { horizontal: 'center' };
      departmentTitleCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFFD6CC' }, // Color naranja claro para Perú
      };

      // Encabezados para departamentos
      sheet.addRow([
        'Departamento',
        'Arribos',
        'Huéspedes',
        'Pernoctaciones',
        'Estancia Promedio (días)',
      ]);

      // Aplicar estilo a los encabezados
      const departmentHeaderRow = sheet.lastRow;
      departmentHeaderRow?.eachCell((cell) => {
        cell.font = { bold: true };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFEEEEEE' },
        };
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      });

      // Datos de departamentos
      data.peruvianDepartmentStats.forEach((deptStat) => {
        sheet.addRow([
          deptStat.department,
          deptStat.arrivals,
          deptStat.guests,
          deptStat.overnights,
          deptStat.averageStayDuration,
        ]);
      });

      // Añadir filas en blanco
      sheet.addRow([]);
      sheet.addRow([]);
    }

    // -- Por cada tipo de habitación --
    data.roomTypeStats.forEach((roomTypeStats, index) => {
      const startRow = sheet.rowCount + 1;

      // Título del tipo de habitación
      const roomTypeTitle = `ESTADÍSTICAS: ${roomTypeStats.roomTypeName}`;
      sheet.mergeCells(`A${startRow}:G${startRow}`);
      const roomTypeTitleCell = sheet.getCell(`A${startRow}`);
      roomTypeTitleCell.value = roomTypeTitle;
      roomTypeTitleCell.font = { bold: true, size: 14 };
      roomTypeTitleCell.alignment = { horizontal: 'center' };
      roomTypeTitleCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFDDEEFF' },
      };

      // Datos generales del tipo de habitación
      sheet.addRow(['Capacidad por habitación', roomTypeStats.capacity]);
      sheet.addRow([
        'Habitaciones disponibles',
        roomTypeStats.uniqueRoomsCount,
      ]);
      sheet.addRow(['Arribos', roomTypeStats.arrivals]);
      sheet.addRow([
        'Estancia promedio (días)',
        roomTypeStats.averageStayDuration,
      ]);
      sheet.addRow([
        'Días-habitación ocupados',
        roomTypeStats.occupiedRoomDays,
      ]);
      sheet.addRow([
        'Tasa de ocupación',
        `${roomTypeStats.occupancyRatePercent}%`,
      ]);
      sheet.addRow(['Total huéspedes', roomTypeStats.totalGuests]);
      sheet.addRow(['Total pernoctaciones', roomTypeStats.totalOvernights]);

      // Añadir filas en blanco antes del siguiente tipo de habitación
      if (index < data.roomTypeStats.length - 1) {
        sheet.addRow([]);
        sheet.addRow([]);
      }
    });

    // Ajustar anchos de columnas
    sheet.columns.forEach((column) => {
      column.width = 20;
    });

    return workbook;
  }
}
