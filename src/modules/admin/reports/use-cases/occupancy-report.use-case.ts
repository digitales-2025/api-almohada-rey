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
    const sheet = workbook.addWorksheet('Reporte de Pernoctaciones');

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
    const title = `Informe de Pernoctaciones - ${monthNames[month]} ${year}`;
    sheet.mergeCells('A1:G1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = title;
    titleCell.font = { bold: true, size: 16 };
    titleCell.alignment = { horizontal: 'center' };

    // Añadir fila en blanco
    sheet.addRow([]);

    // -- Capacidad de alojamiento ofertada --
    const capacityTitle = 'CAPACIDAD DE ALOJAMIENTO OFERTADA';
    sheet.mergeCells('A3:G3');
    const capacityTitleCell = sheet.getCell('A3');
    capacityTitleCell.value = capacityTitle;
    capacityTitleCell.font = { bold: true, size: 14 };
    capacityTitleCell.alignment = { horizontal: 'center' };
    capacityTitleCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE6E6FF' },
    };

    // Encabezados de capacidad
    sheet.addRow([
      'Tipo de habitación',
      'Total de Arribos',
      'Total de Habitaciones pernoctadas',
      'Total de personas pernoctadas',
      'Tasa de ocupación',
    ]);

    // Aplicar estilo a los encabezados
    const capacityHeaderRow = sheet.lastRow;
    capacityHeaderRow?.eachCell((cell) => {
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

    // Datos de capacidad
    data.roomTypeStats.forEach((roomType) => {
      sheet.addRow([
        roomType.roomTypeName,
        roomType.arrivals,
        roomType.occupiedRoomDays,
        roomType.totalGuests,
        `${roomType.occupancyRatePercent}%`,
      ]);
    });

    // Totales
    sheet.addRow([
      'Totales',
      data.summary.totalArrivals,
      data.summary.totalOvernights,
      data.summary.totalGuests,
      '',
    ]);

    // Añadir filas en blanco
    sheet.addRow([]);
    sheet.addRow([]);

    // -- Número de arribos de huéspedes por días del mes --
    const arrivalsTitle = 'NÚMERO DE ARRIBOS DE HUÉSPEDES POR DÍAS DEL MES';
    sheet.mergeCells(`A${sheet.rowCount + 1}:G${sheet.rowCount + 1}`);
    const arrivalsTitleCell = sheet.getCell(`A${sheet.rowCount}`);
    arrivalsTitleCell.value = arrivalsTitle;
    arrivalsTitleCell.font = { bold: true, size: 14 };
    arrivalsTitleCell.alignment = { horizontal: 'center' };
    arrivalsTitleCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFDEDEFF' },
    };

    // Encabezados de días
    sheet.addRow([
      'Lunes',
      'Martes',
      'Miércoles',
      'Jueves',
      'Viernes',
      'Sábado',
      'Domingo',
    ]);

    // Aplicar estilo a los encabezados
    const daysHeaderRow = sheet.lastRow;
    daysHeaderRow?.eachCell((cell) => {
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

    // Organizar datos por días de la semana
    const daysData = this.organizeDataByWeekDays(data.dailyStats);
    daysData.forEach((weekRow) => {
      sheet.addRow(weekRow);
    });

    // Añadir filas en blanco
    sheet.addRow([]);
    sheet.addRow([]);

    // -- Arribos y pernoctaciones según lugar de residencia (Internacionales) --
    const internationalTitle =
      'ARRIBOS Y PERNOCTACIONES SEGÚN LUGAR DE RESIDENCIA (INTERNACIONALES)';
    sheet.mergeCells(`A${sheet.rowCount + 1}:G${sheet.rowCount + 1}`);
    const internationalTitleCell = sheet.getCell(`A${sheet.rowCount}`);
    internationalTitleCell.value = internationalTitle;
    internationalTitleCell.font = { bold: true, size: 14 };
    internationalTitleCell.alignment = { horizontal: 'center' };
    internationalTitleCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFCCE5FF' },
    };

    // Encabezados internacionales
    sheet.addRow(['País', 'Arribos', 'Pernoctaciones']);

    // Aplicar estilo a los encabezados
    const internationalHeaderRow = sheet.lastRow;
    internationalHeaderRow?.eachCell((cell) => {
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

    // Datos internacionales
    data.nationalityStats.forEach((country) => {
      sheet.addRow([country.country, country.arrivals, country.overnights]);
    });

    // Añadir filas en blanco
    sheet.addRow([]);
    sheet.addRow([]);

    // -- Arribos y pernoctaciones según lugar de residencia (Nacionales) --
    const nationalTitle =
      'ARRIBOS Y PERNOCTACIONES SEGÚN LUGAR DE RESIDENCIA (NACIONALES)';
    sheet.mergeCells(`A${sheet.rowCount + 1}:G${sheet.rowCount + 1}`);
    const nationalTitleCell = sheet.getCell(`A${sheet.rowCount}`);
    nationalTitleCell.value = nationalTitle;
    nationalTitleCell.font = { bold: true, size: 14 };
    nationalTitleCell.alignment = { horizontal: 'center' };
    nationalTitleCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFFD6CC' },
    };

    // Encabezados nacionales
    sheet.addRow(['Departamento', 'Arribos', 'Pernoctaciones']);

    // Aplicar estilo a los encabezados
    const nationalHeaderRow = sheet.lastRow;
    nationalHeaderRow?.eachCell((cell) => {
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

    // Datos nacionales
    data.peruvianDepartmentStats.forEach((department) => {
      sheet.addRow([
        department.department,
        department.arrivals,
        department.overnights,
      ]);
    });

    // Añadir filas en blanco
    sheet.addRow([]);
    sheet.addRow([]);

    // -- Resumen global --
    const globalSummaryTitle = 'RESUMEN GLOBAL';
    sheet.mergeCells(`A${sheet.rowCount + 1}:G${sheet.rowCount + 1}`);
    const globalSummaryTitleCell = sheet.getCell(`A${sheet.rowCount}`);
    globalSummaryTitleCell.value = globalSummaryTitle;
    globalSummaryTitleCell.font = { bold: true, size: 14 };
    globalSummaryTitleCell.alignment = { horizontal: 'center' };
    globalSummaryTitleCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE6FFE6' },
    };

    // Datos del resumen global
    sheet.addRow(['Total Arribos:', data.summary.totalArrivals]);
    sheet.addRow(['Total Pernoctaciones:', data.summary.totalOvernights]);
    sheet.addRow(['Total Huéspedes:', data.summary.totalGuests]);
    sheet.addRow(['Países de Origen:', data.summary.totalCountries]);
    sheet.addRow([
      'Departamentos (Perú):',
      data.summary.totalPeruvianDepartments,
    ]);
    sheet.addRow(['Tipos de Habitación:', data.summary.totalRoomTypes]);

    // Ajustar anchos de columnas
    sheet.columns.forEach((column, index) => {
      if (index === 0) {
        column.width = 25; // Hacer más ancha la primera columna
      } else {
        column.width = 18;
      }
    });

    return workbook;
  }

  private organizeDataByWeekDays(dailyStats: any[]): any[] {
    // Implementación para organizar los datos por días de la semana
    // como se muestra en la imagen (filas de 7 días)
    const result = [];
    let currentWeek = Array(7).fill('');

    dailyStats.forEach((day, index) => {
      const dayOfWeek = new Date(day.date).getDay(); // 0=Domingo, 1=Lunes, etc.
      const adjustedIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Ajustar para que Lunes=0

      currentWeek[adjustedIndex] = day.arrivals;

      // Si hemos completado una semana o es el último día, añadir al resultado
      if (adjustedIndex === 6 || index === dailyStats.length - 1) {
        result.push([...currentWeek]);
        currentWeek = Array(7).fill('');
      }
    });

    return result;
  }
}
