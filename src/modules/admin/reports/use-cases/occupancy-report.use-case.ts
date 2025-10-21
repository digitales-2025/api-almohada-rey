import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { OccupancyStatsResponse } from '../interfaces/occupancy';
import { ReportsRepository } from '../repositories/reports.repository';
import { colors } from 'src/utils/colors/colors.utils';

@Injectable()
export class OccupancyReportUseCase {
  constructor(private readonly reportsRepository: ReportsRepository) {}

  async execute(
    data: OccupancyStatsResponse | null | undefined,
    { startDate, endDate }: { startDate: string; endDate: string },
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
      startDate: startDate,
      endDate: endDate,
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

    // -- Título principal --
    const title = `INFORME DE PERNOCTACIONES - ${startDate} a ${endDate}`;
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
      startDate,
      endDate,
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

    // Insertar datos por día con separadores de mes
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

    dailyData.forEach((day, index) => {
      // Extraer mes de la fecha
      const date = new Date(day.date + 'T00:00:00');
      const month = date.getMonth();
      const year = date.getFullYear();

      // Verificar si cambió el mes
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
        sheet.mergeCells(`A${monthRow.number}:C${monthRow.number}`);

        currentMonth = month;
      }

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

    // Agregar totales del último mes
    if (currentMonth !== null) {
      this.addMonthTotals(sheet, monthNames[currentMonth]);
    }

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

    // -- Razones de Reserva --
    const reasonsTitle =
      'RAZONES DE RESERVA - ANÁLISIS PARA TOMA DE DECISIONES';
    sheet.mergeCells(`A${sheet.rowCount}:H${sheet.rowCount}`);
    const reasonsTitleCell = sheet.getCell(`A${sheet.rowCount}`);
    reasonsTitleCell.value = reasonsTitle;
    reasonsTitleCell.font = {
      bold: true,
      size: 14,
      color: { argb: colors.headerText },
    };
    reasonsTitleCell.alignment = {
      horizontal: 'center',
      vertical: 'middle',
    };
    reasonsTitleCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: colors.titleBg },
    };
    sheet.getRow(sheet.rowCount).height = 24;

    // Encabezados para razones
    sheet.addRow([
      'Razón de Reserva',
      'Arribos',
      'Pernoctaciones',
      'Huéspedes',
      'Estancia Media',
      '% del Total',
      'Prioridad',
    ]);

    // Aplicar estilo a los encabezados de razones
    const reasonsHeaderRow = sheet.lastRow;
    reasonsHeaderRow?.eachCell((cell) => {
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

    // Obtener datos de razones reales del repositorio
    const reasonsData = await this.getReasonsData(startDate, endDate);

    // Insertar datos de razones
    reasonsData.forEach((reason, index) => {
      const reasonRow = sheet.addRow([
        reason.reason,
        reason.arrivals,
        reason.overnights,
        reason.guests,
        reason.averageStayDuration,
        `${reason.percentageOfTotal}%`,
        this.getPriorityLevel(reason.percentageOfTotal),
      ]);

      // Alternar colores de fondo
      const fillColor = index % 2 === 0 ? 'FFFFFFFF' : colors.alternateBg;
      reasonRow.eachCell((cell, colNumber) => {
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
          cell.font = { bold: true };
        } else if (colNumber === 6) {
          // Columna de porcentaje
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
          if (reason.percentageOfTotal > 30) {
            cell.font = { bold: true, color: { argb: `FF${colors.SUCCESS}` } }; // Verde corporativo para alto porcentaje
          } else if (reason.percentageOfTotal > 15) {
            cell.font = {
              bold: true,
              color: { argb: `FF${colors.DARK_GOLD}` },
            }; // Dorado oscuro para medio porcentaje
          }
        } else if (colNumber === 7) {
          // Columna de prioridad
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
          const priority = this.getPriorityLevel(reason.percentageOfTotal);
          if (priority === 'Alta') {
            cell.font = { bold: true, color: { argb: `FF${colors.WARNING}` } }; // Rojo corporativo para alta prioridad
          } else if (priority === 'Media') {
            cell.font = {
              bold: true,
              color: { argb: `FF${colors.DARK_GOLD}` },
            }; // Dorado oscuro para media prioridad
          } else {
            cell.font = { bold: true, color: { argb: `FF${colors.SUCCESS}` } }; // Verde corporativo para baja prioridad
          }
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

  private prepareDailyData(
    dailyStats: any[],
    startDate: string,
    endDate: string,
  ) {
    // Crear un mapa para acceso rápido
    const dailyStatsMap: Record<
      string,
      { date: string; arrivals: number; overnights: number }
    > = {};
    dailyStats.forEach((day) => {
      dailyStatsMap[day.date] = day;
    });

    // Crear un array con todos los días del rango
    const result = [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    const current = new Date(start);

    while (current <= end) {
      const dateStr = current.toISOString().split('T')[0];
      const dayOfWeek = current.getDay();
      const weekDays = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
      const dayStr = current.getDate().toString().padStart(2, '0');

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

      // Avanzar al siguiente día
      current.setDate(current.getDate() + 1);
    }

    return result;
  }

  /**
   * Obtiene datos de razones de reserva del repositorio
   * @private
   */
  private async getReasonsData(
    startDate: string,
    endDate: string,
  ): Promise<
    Array<{
      reason: string;
      arrivals: number;
      overnights: number;
      guests: number;
      averageStayDuration: number;
      percentageOfTotal: number;
    }>
  > {
    try {
      const reasonsStats =
        await this.reportsRepository.getReservationReasonsStats(
          startDate,
          endDate,
        );
      return reasonsStats.reasons;
    } catch (error) {
      console.error('Error obteniendo estadísticas de razones:', error);
      return [];
    }
  }

  /**
   * Determina el nivel de prioridad basado en el porcentaje
   * @private
   */
  private getPriorityLevel(percentage: number): string {
    if (percentage > 30) {
      return 'Alta';
    } else if (percentage > 15) {
      return 'Media';
    } else {
      return 'Baja';
    }
  }

  /**
   * Genera un reporte comparativo de ocupación entre dos años
   * @param data1 Datos del primer año
   * @param data2 Datos del segundo año
   * @param years Años a comparar
   * @returns Workbook con 3 hojas: Resumen Comparativo, Detalle Año 1, Detalle Año 2
   */
  async executeCompare(
    data1: OccupancyStatsResponse,
    data2: OccupancyStatsResponse,
    { year1, year2 }: { year1: number; year2: number },
  ): Promise<ExcelJS.Workbook> {
    const workbook = new ExcelJS.Workbook();

    // Hoja 1: Resumen Comparativo
    const summarySheet = workbook.addWorksheet('Resumen Comparativo');
    this.createOccupancyComparisonSummary(
      summarySheet,
      data1,
      data2,
      year1,
      year2,
    );

    // Hoja 2: Detalle Año 1
    const detailSheet1 = workbook.addWorksheet(`Detalle ${year1}`);
    this.createOccupancyDetailSheet(detailSheet1, data1, year1);

    // Hoja 3: Detalle Año 2
    const detailSheet2 = workbook.addWorksheet(`Detalle ${year2}`);
    this.createOccupancyDetailSheet(detailSheet2, data2, year2);

    return workbook;
  }

  private createOccupancyComparisonSummary(
    sheet: ExcelJS.Worksheet,
    data1: OccupancyStatsResponse,
    data2: OccupancyStatsResponse,
    year1: number,
    year2: number,
  ) {
    // Título principal
    sheet.mergeCells('A1:G1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = `Reporte Comparativo de Ocupación - ${year1} vs ${year2}`;
    titleCell.font = { size: 16, bold: true, color: { argb: colors.PRIMARY } };
    titleCell.alignment = { horizontal: 'center' };

    // Subtítulo
    sheet.mergeCells('A2:G2');
    const subtitleCell = sheet.getCell('A2');
    subtitleCell.value =
      'Análisis comparativo de ocupación por tipo de habitación';
    subtitleCell.font = { size: 12, italic: true };
    subtitleCell.alignment = { horizontal: 'center' };

    // Espacio
    sheet.getRow(3).height = 20;

    // Encabezados de la tabla comparativa
    const headers = [
      'Tipo de Habitación',
      `${year1} Ocupación (%)`,
      `${year2} Ocupación (%)`,
      'Diferencia (%)',
      'Variación (%)',
      'Tendencia',
      'Estado',
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

    // Calcular comparaciones por tipo de habitación
    const roomTypes = this.getUniqueRoomTypes(data1, data2);
    let currentRow = 5;

    roomTypes.forEach((roomType) => {
      const occupancy1 = this.getOccupancyByRoomType(data1, roomType);
      const occupancy2 = this.getOccupancyByRoomType(data2, roomType);
      const difference = occupancy1 - occupancy2;
      const variation = occupancy2 !== 0 ? (difference / occupancy2) * 100 : 0;
      const trend = this.getTrendIcon(variation);
      const status = this.getOccupancyStatus(occupancy1);

      const row = sheet.getRow(currentRow);
      row.getCell(1).value = roomType;
      row.getCell(2).value = occupancy1;
      row.getCell(3).value = occupancy2;
      row.getCell(4).value = difference;
      row.getCell(5).value = variation;
      row.getCell(6).value = trend;
      row.getCell(7).value = status;

      // Formatear números
      row.getCell(2).numFmt = '0.00"%"';
      row.getCell(3).numFmt = '0.00"%"';
      row.getCell(4).numFmt = '0.00"%"';
      row.getCell(5).numFmt = '0.00"%"';

      // Colorear según tendencia
      if (variation > 5) {
        row.getCell(4).font = { color: { argb: '00AA00' } }; // Verde para aumento
        row.getCell(5).font = { color: { argb: '00AA00' } };
      } else if (variation < -5) {
        row.getCell(4).font = { color: { argb: 'AA0000' } }; // Rojo para disminución
        row.getCell(5).font = { color: { argb: 'AA0000' } };
      }

      // Colorear estado
      if (status === 'Excelente') {
        row.getCell(7).font = { color: { argb: '00AA00' } };
      } else if (status === 'Buena') {
        row.getCell(7).font = { color: { argb: 'FFA500' } };
      } else {
        row.getCell(7).font = { color: { argb: 'AA0000' } };
      }

      currentRow++;
    });

    // Fila de totales
    const totalRow = sheet.getRow(currentRow);
    const totalOccupancy1 = this.getTotalOccupancy(data1);
    const totalOccupancy2 = this.getTotalOccupancy(data2);
    const totalDiff = totalOccupancy1 - totalOccupancy2;
    const totalVariation =
      totalOccupancy2 !== 0 ? (totalDiff / totalOccupancy2) * 100 : 0;

    totalRow.getCell(1).value = 'PROMEDIO GENERAL';
    totalRow.getCell(1).font = { bold: true };
    totalRow.getCell(2).value = totalOccupancy1;
    totalRow.getCell(3).value = totalOccupancy2;
    totalRow.getCell(4).value = totalDiff;
    totalRow.getCell(5).value = totalVariation;
    totalRow.getCell(6).value = this.getTrendIcon(totalVariation);
    totalRow.getCell(7).value = this.getOccupancyStatus(totalOccupancy1);

    // Formatear totales
    totalRow.getCell(2).numFmt = '0.00"%"';
    totalRow.getCell(3).numFmt = '0.00"%"';
    totalRow.getCell(4).numFmt = '0.00"%"';
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
      { width: 18 }, // Año 1
      { width: 18 }, // Año 2
      { width: 15 }, // Diferencia
      { width: 12 }, // Variación
      { width: 10 }, // Tendencia
      { width: 12 }, // Estado
    ];
  }

  private createOccupancyDetailSheet(
    sheet: ExcelJS.Worksheet,
    data: OccupancyStatsResponse,
    year: number,
  ) {
    // Título
    sheet.mergeCells('A1:G1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = `Reporte de Ocupación - ${year}`;
    titleCell.font = { size: 16, bold: true, color: { argb: colors.PRIMARY } };
    titleCell.alignment = { horizontal: 'center' };

    // Espacio
    sheet.getRow(2).height = 20;

    // Encabezados
    const headers = [
      'Tipo de Habitación',
      'Habitaciones',
      'Días Ocupados',
      'Días Totales',
      'Ocupación (%)',
      'Estado',
      'Prioridad',
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
    data.roomTypeStats.forEach((roomType) => {
      const row = sheet.getRow(currentRow);
      row.getCell(1).value = roomType.roomTypeName;
      row.getCell(2).value = roomType.totalRoomsOfThisType;
      row.getCell(3).value = roomType.occupiedRoomDays;
      row.getCell(4).value = roomType.summary.totalRooms;
      row.getCell(5).value = roomType.occupancyRatePercent;
      row.getCell(6).value = this.getOccupancyStatus(
        roomType.occupancyRatePercent,
      );
      row.getCell(7).value = this.getPriorityLevel(
        roomType.occupancyRatePercent,
      );

      // Formatear números
      row.getCell(2).numFmt = '#,##0';
      row.getCell(3).numFmt = '#,##0';
      row.getCell(4).numFmt = '#,##0';
      row.getCell(5).numFmt = '0.00"%"';

      // Colorear estado
      if (row.getCell(6).value === 'Excelente') {
        row.getCell(6).font = { color: { argb: '00AA00' } };
      } else if (row.getCell(6).value === 'Buena') {
        row.getCell(6).font = { color: { argb: 'FFA500' } };
      } else {
        row.getCell(6).font = { color: { argb: 'AA0000' } };
      }

      // Colorear prioridad
      if (row.getCell(7).value === 'Alta') {
        row.getCell(7).font = { color: { argb: 'AA0000' } };
      } else if (row.getCell(7).value === 'Media') {
        row.getCell(7).font = { color: { argb: 'FFA500' } };
      } else {
        row.getCell(7).font = { color: { argb: '00AA00' } };
      }

      currentRow++;
    });

    // Ajustar ancho de columnas
    sheet.columns = [
      { width: 30 }, // Tipo de Habitación
      { width: 15 }, // Habitaciones
      { width: 15 }, // Días Ocupados
      { width: 15 }, // Días Totales
      { width: 15 }, // Ocupación (%)
      { width: 12 }, // Estado
      { width: 12 }, // Prioridad
    ];
  }

  private getUniqueRoomTypes(
    data1: OccupancyStatsResponse,
    data2: OccupancyStatsResponse,
  ): string[] {
    const roomTypes = new Set<string>();
    data1.roomTypeStats.forEach((item) => roomTypes.add(item.roomTypeName));
    data2.roomTypeStats.forEach((item) => roomTypes.add(item.roomTypeName));
    return Array.from(roomTypes).sort();
  }

  private getOccupancyByRoomType(
    data: OccupancyStatsResponse,
    roomType: string,
  ): number {
    const roomTypeData = data.roomTypeStats.find(
      (item) => item.roomTypeName === roomType,
    );
    return roomTypeData ? roomTypeData.occupancyRatePercent : 0;
  }

  private getTotalOccupancy(data: OccupancyStatsResponse): number {
    if (data.roomTypeStats.length === 0) return 0;
    const totalOccupancy = data.roomTypeStats.reduce(
      (sum, item) => sum + item.occupancyRatePercent,
      0,
    );
    return totalOccupancy / data.roomTypeStats.length;
  }

  private getOccupancyStatus(percentage: number): string {
    if (percentage >= 80) {
      return 'Excelente';
    } else if (percentage >= 60) {
      return 'Buena';
    } else {
      return 'Baja';
    }
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
    sheet.mergeCells(`A${totalRow.number}:C${totalRow.number}`);

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
