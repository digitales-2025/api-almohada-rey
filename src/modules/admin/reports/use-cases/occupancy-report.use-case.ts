import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { OccupancyStatsResponse } from '../interfaces/occupancy';

@Injectable()
export class OccupancyReportUseCase {
  async execute(
    data: OccupancyStatsResponse | null | undefined,
    { month, year }: { month: number; year: number },
  ): Promise<ExcelJS.Workbook> {
    // Validación de datos...
    const safeData: Partial<OccupancyStatsResponse> = data || {};
    const safeRoomTypeStats = safeData.roomTypeStats || [];

    // Calcular los totales que no vienen en el summary original
    const totalRooms = safeRoomTypeStats.reduce(
      (sum, type) => sum + (type.totalRoomsOfThisType || 0),
      0,
    );

    const totalUniqueRooms = safeRoomTypeStats.reduce(
      (sum, type) => sum + (type.uniqueRoomsCount || 0),
      0,
    );

    // Crear un objeto summary completo con los valores calculados
    const safeSummary = {
      ...safeData.summary,
      month: month,
      year: year,
      totalRoomTypes: safeData.summary?.totalRoomTypes || 0,
      totalCountries: safeData.summary?.totalCountries || 0,
      totalPeruvianDepartments: safeData.summary?.totalPeruvianDepartments || 0,
      totalArrivals: safeData.summary?.totalArrivals || 0,
      totalOvernights: safeData.summary?.totalOvernights || 0,
      totalGuests: safeData.summary?.totalGuests || 0,
      totalRooms: totalRooms,
      totalUniqueRooms: totalUniqueRooms,
    };

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

    // -- Definir colores de tema --
    const colors = {
      headerBg: 'FF4472C4', // Azul principal
      headerText: 'FFFFFFFF', // Blanco
      titleBg: 'FF5B9BD5', // Azul claro
      subTitleBg: 'FFD6E6F4', // Azul muy claro
      alternateBg: 'FFF2F2F2', // Gris claro para filas alternadas
      highlightBg: 'FFFFDECE', // Amarillo claro para destacados
      arrivalsColor: 'FF70AD47', // Verde para arribos
      overnightsColor: 'FFE84234', // Rojo para pernoctaciones
      borderColor: 'FFB4B4B4', // Gris para bordes
      totalsBg: 'FFDAEEF3', // Azul pálido para totales
    };

    // -- Título principal --
    const title = `INFORME DE PERNOCTACIONES - ${monthNames[month].toUpperCase()} ${year}`;
    sheet.mergeCells('A1:H1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = title;
    titleCell.font = {
      bold: true,
      size: 18,
      color: { argb: colors.headerText },
    };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    titleCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: colors.headerBg },
    };
    sheet.getRow(1).height = 30; // Alto de fila para el título principal

    // Añadir fila en blanco
    sheet.addRow([]);

    // -- Capacidad de alojamiento ofertada --
    const capacityTitle = 'CAPACIDAD DE ALOJAMIENTO OFERTADA';
    sheet.mergeCells('A3:H3');
    const capacityTitleCell = sheet.getCell('A3');
    capacityTitleCell.value = capacityTitle;
    capacityTitleCell.font = {
      bold: true,
      size: 14,
      color: { argb: colors.headerText },
    };
    capacityTitleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    capacityTitleCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: colors.titleBg },
    };
    sheet.getRow(3).height = 24;

    // Encabezados de capacidad
    const capacityHeaders = [
      'Tipo de habitación',
      'Total de Habitaciones',
      'Total de Arribos',
      'Habitaciones Ocupadas',
      'Pernoctaciones',
      'Tasa de ocupación (Arribos)',
      'Tasa de ocupación (Días)',
    ];
    sheet.addRow(capacityHeaders);

    // Aplicar estilo a los encabezados
    const capacityHeaderRow = sheet.lastRow;
    capacityHeaderRow?.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: colors.headerText } };
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
      cell.alignment = {
        horizontal: 'center',
        vertical: 'middle',
        wrapText: true,
      };
    });
    sheet.getRow(4).height = 30;

    // Datos de capacidad con filas alternadas
    safeRoomTypeStats.forEach((roomType, index) => {
      const row = sheet.addRow([
        roomType.roomTypeName,
        roomType.totalRoomsOfThisType || 0,
        roomType.arrivals,
        roomType.uniqueRoomsCount,
        roomType.totalOvernights,
        `${roomType.occupancyRateByArrivalsPercent || 0}%`,
        `${roomType.occupancyRatePercent}%`,
      ]);

      // Alternar colores de fondo
      const fillColor = index % 2 === 0 ? 'FFFFFFFF' : colors.alternateBg;
      row.eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: fillColor },
        };
        cell.border = {
          top: { style: 'thin', color: { argb: colors.borderColor } },
          left: { style: 'thin', color: { argb: colors.borderColor } },
          bottom: { style: 'thin', color: { argb: colors.borderColor } },
          right: { style: 'thin', color: { argb: colors.borderColor } },
        };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      });

      // La primera celda alineada a la izquierda
      row.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };
    });

    // Totales con estilo destacado
    const totalsRow = sheet.addRow([
      'Totales',
      safeSummary.totalRooms,
      safeSummary.totalArrivals,
      safeSummary.totalUniqueRooms,
      safeSummary.totalOvernights,
      '',
      '',
    ]);
    totalsRow.eachCell((cell) => {
      cell.font = { bold: true };
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
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });
    // La primera celda alineada a la izquierda
    totalsRow.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };

    // Añadir filas en blanco
    sheet.addRow([]);
    sheet.addRow([]);

    // -- Número de arribos y pernoctaciones por días del mes --
    const arrivalsTitle = 'NÚMERO DE ARRIBOS Y PERNOCTACIONES POR DÍAS DEL MES';
    sheet.mergeCells(`A${sheet.rowCount}:H${sheet.rowCount}`);
    const arrivalsTitleCell = sheet.getCell(`A${sheet.rowCount}`);
    arrivalsTitleCell.value = arrivalsTitle;
    arrivalsTitleCell.font = {
      bold: true,
      size: 14,
      color: { argb: colors.headerText },
    };
    arrivalsTitleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    arrivalsTitleCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: colors.titleBg },
    };
    sheet.getRow(sheet.rowCount).height = 24;

    // Preparar los datos diarios
    const dailyData = this.prepareDailyData(
      safeData.dailyStats || [],
      month,
      year,
    );

    // Encabezados para la tabla de días
    sheet.addRow(['Día', 'Arribos', 'Pernoctaciones']);

    // Estilo para los encabezados de la tabla diaria
    const dailyHeaderRow = sheet.lastRow;
    dailyHeaderRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: colors.headerText } };
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
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });
    sheet.getRow(sheet.rowCount).height = 24;

    // Insertar datos por día
    dailyData.forEach((day, index) => {
      const dayRow = sheet.addRow([day.dayLabel, day.arrivals, day.overnights]);

      // Estilo para filas alternadas
      const fillColor = index % 2 === 0 ? 'FFFFFFFF' : colors.alternateBg;
      dayRow.eachCell((cell, colNumber) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: fillColor },
        };
        cell.border = {
          top: { style: 'thin', color: { argb: colors.borderColor } },
          left: { style: 'thin', color: { argb: colors.borderColor } },
          bottom: { style: 'thin', color: { argb: colors.borderColor } },
          right: { style: 'thin', color: { argb: colors.borderColor } },
        };

        // Alineación y colores especiales según la columna
        if (colNumber === 1) {
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
          cell.font = { bold: true };
        } else if (colNumber === 2) {
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
          if (day.arrivals > 0) {
            cell.font = { color: { argb: colors.arrivalsColor } };
          }
        } else if (colNumber === 3) {
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
          if (day.overnights > 0) {
            cell.font = { color: { argb: colors.overnightsColor } };
          }
        }
      });
    });

    // Añadir totales de días
    const totalArrivals = dailyData.reduce((sum, day) => sum + day.arrivals, 0);
    const totalOvernights = dailyData.reduce(
      (sum, day) => sum + day.overnights,
      0,
    );

    const totalDayRow = sheet.addRow(['TOTAL', totalArrivals, totalOvernights]);
    totalDayRow.eachCell((cell) => {
      cell.font = { bold: true };
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
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });

    // Añadir filas en blanco
    sheet.addRow([]);
    sheet.addRow([]);

    // -- Arribos y pernoctaciones según lugar de residencia (Internacionales) --
    const internationalTitle =
      'ARRIBOS Y PERNOCTACIONES SEGÚN LUGAR DE RESIDENCIA (INTERNACIONALES)';
    sheet.mergeCells(`A${sheet.rowCount}:H${sheet.rowCount}`);
    const internationalTitleCell = sheet.getCell(`A${sheet.rowCount}`);
    internationalTitleCell.value = internationalTitle;
    internationalTitleCell.font = {
      bold: true,
      size: 14,
      color: { argb: colors.headerText },
    };
    internationalTitleCell.alignment = {
      horizontal: 'center',
      vertical: 'middle',
    };
    internationalTitleCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: colors.titleBg },
    };
    sheet.getRow(sheet.rowCount).height = 24;

    // Encabezados internacionales
    sheet.addRow(['País', 'Arribos', 'Pernoctaciones', 'Estancia Media']);

    // Aplicar estilo a los encabezados
    const internationalHeaderRow = sheet.lastRow;
    internationalHeaderRow?.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: colors.headerText } };
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
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });
    sheet.getRow(sheet.rowCount).height = 24;

    // Datos internacionales con filas alternadas
    (safeData.nationalityStats || []).forEach((country, index) => {
      const countryRow = sheet.addRow([
        country.country,
        country.arrivals,
        country.overnights,
        country.averageStayDuration,
      ]);

      // Alternar colores de fondo
      const fillColor = index % 2 === 0 ? 'FFFFFFFF' : colors.alternateBg;
      countryRow.eachCell((cell, colNumber) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: fillColor },
        };
        cell.border = {
          top: { style: 'thin', color: { argb: colors.borderColor } },
          left: { style: 'thin', color: { argb: colors.borderColor } },
          bottom: { style: 'thin', color: { argb: colors.borderColor } },
          right: { style: 'thin', color: { argb: colors.borderColor } },
        };

        // Alineación según la columna
        if (colNumber === 1) {
          cell.alignment = { horizontal: 'left', vertical: 'middle' };
        } else {
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        }
      });
    });

    // Añadir filas en blanco
    sheet.addRow([]);
    sheet.addRow([]);

    // -- Arribos y pernoctaciones según lugar de residencia (Nacionales) --
    const nationalTitle =
      'ARRIBOS Y PERNOCTACIONES SEGÚN LUGAR DE RESIDENCIA (NACIONALES)';
    sheet.mergeCells(`A${sheet.rowCount}:H${sheet.rowCount}`);
    const nationalTitleCell = sheet.getCell(`A${sheet.rowCount}`);
    nationalTitleCell.value = nationalTitle;
    nationalTitleCell.font = {
      bold: true,
      size: 14,
      color: { argb: colors.headerText },
    };
    nationalTitleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    nationalTitleCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: colors.titleBg },
    };
    sheet.getRow(sheet.rowCount).height = 24;

    // Encabezados nacionales
    sheet.addRow([
      'Departamento',
      'Arribos',
      'Pernoctaciones',
      'Estancia Media',
    ]);

    // Aplicar estilo a los encabezados
    const nationalHeaderRow = sheet.lastRow;
    nationalHeaderRow?.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: colors.headerText } };
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
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });
    sheet.getRow(sheet.rowCount).height = 24;

    // Datos nacionales con filas alternadas
    (safeData.peruvianDepartmentStats || []).forEach((department, index) => {
      const departmentRow = sheet.addRow([
        department.department,
        department.arrivals,
        department.overnights,
        department.averageStayDuration,
      ]);

      // Alternar colores de fondo
      const fillColor = index % 2 === 0 ? 'FFFFFFFF' : colors.alternateBg;
      departmentRow.eachCell((cell, colNumber) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: fillColor },
        };
        cell.border = {
          top: { style: 'thin', color: { argb: colors.borderColor } },
          left: { style: 'thin', color: { argb: colors.borderColor } },
          bottom: { style: 'thin', color: { argb: colors.borderColor } },
          right: { style: 'thin', color: { argb: colors.borderColor } },
        };

        // Alineación según la columna
        if (colNumber === 1) {
          cell.alignment = { horizontal: 'left', vertical: 'middle' };
        } else {
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        }
      });
    });

    // Añadir filas en blanco
    sheet.addRow([]);
    sheet.addRow([]);

    // -- Resumen global --
    const globalSummaryTitle = 'RESUMEN GLOBAL';
    sheet.mergeCells(`A${sheet.rowCount}:H${sheet.rowCount}`);
    const globalSummaryTitleCell = sheet.getCell(`A${sheet.rowCount}`);
    globalSummaryTitleCell.value = globalSummaryTitle;
    globalSummaryTitleCell.font = {
      bold: true,
      size: 14,
      color: { argb: colors.headerText },
    };
    globalSummaryTitleCell.alignment = {
      horizontal: 'center',
      vertical: 'middle',
    };
    globalSummaryTitleCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: colors.titleBg },
    };
    sheet.getRow(sheet.rowCount).height = 24;

    // Datos del resumen global con mejor estilo
    const summaryData = [
      ['Total Arribos:', safeSummary.totalArrivals],
      ['Total Pernoctaciones:', safeSummary.totalOvernights],
      ['Total Huéspedes:', safeSummary.totalGuests],
      ['Países de Origen:', safeSummary.totalCountries],
      ['Departamentos (Perú):', safeSummary.totalPeruvianDepartments],
      ['Tipos de Habitación:', safeSummary.totalRoomTypes],
    ];

    summaryData.forEach((row, index) => {
      const summaryRow = sheet.addRow(row);

      // Alternar colores de fondo
      const fillColor = index % 2 === 0 ? 'FFFFFFFF' : colors.alternateBg;
      summaryRow.eachCell((cell, colNumber) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: fillColor },
        };
        cell.border = {
          top: { style: 'thin', color: { argb: colors.borderColor } },
          left: { style: 'thin', color: { argb: colors.borderColor } },
          bottom: { style: 'thin', color: { argb: colors.borderColor } },
          right: { style: 'thin', color: { argb: colors.borderColor } },
        };

        if (colNumber === 1) {
          cell.font = { bold: true };
          cell.alignment = { horizontal: 'right', vertical: 'middle' };
        } else {
          cell.alignment = { horizontal: 'left', vertical: 'middle' };
          cell.font = { bold: true, color: { argb: colors.arrivalsColor } };
        }
      });
    });

    // Ajustar anchos de columnas
    sheet.columns.forEach((column, index) => {
      if (index === 0) {
        column.width = 25; // Hacer más ancha la primera columna
      } else {
        column.width = 18;
      }
    });

    // Agregar pie de página con fecha de generación
    const currentDate = new Date().toLocaleDateString('es-ES');
    const footerRow = sheet.addRow([`Informe generado el ${currentDate}`]);
    footerRow.getCell(1).font = { italic: true, size: 10 };

    return workbook;
  }

  private prepareDailyData(dailyStats: any[], month: number, year: number) {
    // Obtener el número de días en el mes
    const daysInMonth = new Date(year, month, 0).getDate();

    // Crear un mapa para acceso rápido
    const dailyStatsMap: Record<
      string,
      { date: string; arrivals: number; overnights: number }
    > = {};
    dailyStats.forEach((day) => {
      dailyStatsMap[day.date] = day;
    });

    // Crear un array con todos los días del mes
    const result = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const dayStr = day.toString().padStart(2, '0');
      const dateStr = `${year}-${month.toString().padStart(2, '0')}-${dayStr}`;
      const dayOfWeek = new Date(dateStr).getDay();
      const weekDays = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

      // Crear etiqueta para el día: "01 (Lun)"
      const dayLabel = `${dayStr} (${weekDays[dayOfWeek]})`;

      // Obtener datos o usar valores por defecto
      const dayData = dailyStatsMap[dateStr] || {
        date: dateStr,
        arrivals: 0,
        overnights: 0,
      };

      result.push({
        dayLabel,
        arrivals: dayData.arrivals,
        overnights: dayData.overnights,
        date: dateStr,
      });
    }

    return result;
  }
}
