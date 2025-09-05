import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { ProfitData } from '../interfaces/profit-fields';
import { colors } from 'src/utils/colors/colors.utils';

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

    // -- Generar días del mes completo --
    const diasEnMes = new Date(year, month, 0).getDate();

    // Crear un mapa con los datos existentes para búsqueda rápida
    const dataMap: Record<string, ProfitData> = {};
    data.forEach((item) => {
      dataMap[item.date] = item;
    });

    // -- Agregar los datos para cada día del mes --
    let totalHabitacion = 0;
    let totalExtras = 0;
    let totalGeneral = 0;
    let totalConteo = 0;

    for (let dia = 1; dia <= diasEnMes; dia++) {
      const fechaStr = `${year}-${month.toString().padStart(2, '0')}-${dia.toString().padStart(2, '0')}`;
      const item = dataMap[fechaStr] || {
        date: fechaStr,
        conteo: 0,
        totalReservas: 0,
        totalExtras: 0,
        total: 0,
      };

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
}
