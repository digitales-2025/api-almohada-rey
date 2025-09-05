import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { ProfitRoomTypeData } from '../interfaces/profit-roomtype-fields';
import { colors } from 'src/utils/colors/colors.utils';

@Injectable()
export class ProfitTypeRoomReportUseCase {
  async execute(
    data: ProfitRoomTypeData[],
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
}
