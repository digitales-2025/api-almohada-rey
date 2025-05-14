import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { BalanceData } from '../interfaces/balance';

@Injectable()
export class BalanceReportUseCase {
  async execute(
    data: BalanceData,
    { month, year }: { month: number; year: number },
  ): Promise<ExcelJS.Workbook> {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Balance');

    // -- Título principal --
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
    const title = `Balance de Ganancias y Gastos - ${monthNames[month]} ${year}`;
    sheet.mergeCells('A1:M1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = title;
    titleCell.font = { bold: true, size: 14 };
    titleCell.alignment = { horizontal: 'center' };

    // -- Subtítulos para secciones --
    sheet.addRow([]);
    const subtituloRow = sheet.addRow([
      '', // A - Fecha
      // Sección de Ganancias
      'INGRESOS',
      '',
      '',
      '',
      // Separador
      '',
      // Sección de Gastos
      'GASTOS',
      '',
      '',
      '',
      '',
      '',
      '',
      // Balance
      'BALANCE',
    ]);

    // Formato para los subtítulos
    subtituloRow.eachCell((cell, colNumber) => {
      if (colNumber === 2) {
        // INGRESOS
        cell.font = { bold: true, size: 12 };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFD6FFDA' },
        };
        sheet.mergeCells(`B${subtituloRow.number}:E${subtituloRow.number}`);
      } else if (colNumber === 7) {
        // GASTOS
        cell.font = { bold: true, size: 12 };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFDDDD' },
        };
        sheet.mergeCells(`G${subtituloRow.number}:L${subtituloRow.number}`);
      } else if (colNumber === 13) {
        // BALANCE
        cell.font = { bold: true, size: 12 };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFDADAFF' },
        };
      }
      cell.alignment = { horizontal: 'center' };
    });

    // -- Encabezados de columnas --
    const headers = [
      'Fecha',
      // Sección de Ganancias
      'Conteo Reservas',
      'Total Reservas S/',
      'Total Extras S/',
      'Total Ganancias S/',
      // Separador
      '',
      // Sección de Gastos
      'Mov. Boleta S/',
      'Mov. Factura S/',
      'Mov. Otro S/',
      'Gast. Boleta S/',
      'Gast. Factura S/',
      'Gast. Otro S/',
      'Total Gastos S/',
      // Balance
      'Balance Diario S/',
    ];
    sheet.addRow(headers);

    // -- Estilo de encabezados --
    sheet.getRow(4).eachCell((cell, colNumber) => {
      if (colNumber !== 6) {
        // Saltar el separador vacío
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

        // Colorear diferentes secciones de encabezados
        if (colNumber >= 2 && colNumber <= 5) {
          // Sección Ganancias - Verde claro
          cell.fill.fgColor.argb = 'FFE6FFE6';
        } else if (colNumber >= 7 && colNumber <= 13) {
          // Sección Gastos - Rojo claro
          cell.fill.fgColor.argb = 'FFFFE6E6';
        } else if (colNumber >= 14) {
          // Sección Balance - Azul claro
          cell.fill.fgColor.argb = 'FFE6E6FF';
        }
      }
    });

    // -- Generar días del mes completo --
    const diasEnMes = new Date(year, month, 0).getDate();

    // Crear mapas para búsqueda rápida de datos por fecha
    const profitMap: Record<string, any> = {};
    data.profit.forEach((item) => {
      profitMap[item.date] = item;
    });

    const expenseMap: Record<string, any> = {};
    data.expense.forEach((item) => {
      expenseMap[item.date] = item;
    });

    // -- Agregar los datos día por día --
    let totalConteo = 0;
    let totalReservas = 0;
    let totalExtras = 0;
    let totalGanancias = 0;

    let totalMovBoleta = 0;
    let totalMovFactura = 0;
    let totalMovOtro = 0;
    let totalGastBoleta = 0;
    let totalGastFactura = 0;
    let totalGastOtro = 0;
    let totalGastos = 0;

    for (let dia = 1; dia <= diasEnMes; dia++) {
      const fechaStr = `${year}-${month.toString().padStart(2, '0')}-${dia.toString().padStart(2, '0')}`;

      // Obtener datos de ganancias para esta fecha (o valores por defecto)
      const profit = profitMap[fechaStr] || {
        date: fechaStr,
        conteo: 0,
        totalReservas: 0,
        totalExtras: 0,
        total: 0,
      };

      // Obtener datos de gastos para esta fecha (o valores por defecto)
      const expense = expenseMap[fechaStr] || {
        date: fechaStr,
        amount: 0,
        movimientosBoleta: 0,
        movimientosFactura: 0,
        movimientosOtro: 0,
        gastosBoleta: 0,
        gastosFactura: 0,
        gastosOtro: 0,
        totalMovimientos: 0,
        totalGastos: 0,
      };

      // Calcular balance diario
      const balanceDiario = profit.total - expense.amount;

      // Agregar fila con todos los datos
      const dataRow = sheet.addRow([
        fechaStr,
        // Datos de ganancias
        profit.conteo,
        profit.totalReservas,
        profit.totalExtras,
        profit.total,
        // Separador
        '',
        // Datos de gastos
        expense.movimientosBoleta,
        expense.movimientosFactura,
        expense.movimientosOtro,
        expense.gastosBoleta,
        expense.gastosFactura,
        expense.gastosOtro,
        expense.amount,
        // Balance
        balanceDiario,
      ]);

      // Colorear el balance diario según sea positivo o negativo
      const balanceDiarioCell = sheet.getCell(`N${dataRow.number}`);
      if (balanceDiario < 0) {
        balanceDiarioCell.font = { color: { argb: 'FFFF0000' } };
      } else if (balanceDiario > 0) {
        balanceDiarioCell.font = { color: { argb: 'FF008000' } };
      }

      // Acumular totales
      totalConteo += profit.conteo;
      totalReservas += profit.totalReservas;
      totalExtras += profit.totalExtras;
      totalGanancias += profit.total;

      totalMovBoleta += expense.movimientosBoleta;
      totalMovFactura += expense.movimientosFactura;
      totalMovOtro += expense.movimientosOtro;
      totalGastBoleta += expense.gastosBoleta;
      totalGastFactura += expense.gastosFactura;
      totalGastOtro += expense.gastosOtro;
      totalGastos += expense.amount;
    }

    // -- Fila de totales --
    const totalRow = sheet.addRow([
      'TOTALES',
      totalConteo,
      totalReservas,
      totalExtras,
      totalGanancias,
      // Separador
      '',
      totalMovBoleta,
      totalMovFactura,
      totalMovOtro,
      totalGastBoleta,
      totalGastFactura,
      totalGastOtro,
      totalGastos,
      totalGanancias - totalGastos,
    ]);
    totalRow.font = { bold: true };

    // Aplicar formato a las celdas de totales
    totalRow.eachCell((cell, colNumber) => {
      if (colNumber !== 6) {
        // Saltar separadores
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFEFEFEF' },
        };

        if (colNumber >= 2 && colNumber <= 5) {
          // Totales Ganancias
          cell.fill.fgColor.argb = 'FFE6FFE6';
        } else if (colNumber >= 7 && colNumber <= 13) {
          // Totales Gastos
          cell.fill.fgColor.argb = 'FFFFE6E6';
        } else if (colNumber === 14) {
          // Balance Total
          cell.fill.fgColor.argb = 'FFE6E6FF';

          // Color condicional para el balance
          const balanceTotal = totalGanancias - totalGastos;
          cell.font = {
            bold: true,
            color: { argb: balanceTotal >= 0 ? 'FF008000' : 'FFFF0000' },
          };
        }
      }
    });

    // -- Dos filas vacías antes del resumen de balance --
    sheet.addRow([]);
    sheet.addRow([]);

    // -- Resumen de balance --
    const resumenTitle = `RESUMEN DE BALANCE - ${monthNames[month]} ${year}`;
    sheet.mergeCells(
      `A${sheet.lastRow.number + 1}:E${sheet.lastRow.number + 1}`,
    );
    const resumenRow = sheet.addRow([resumenTitle]);
    const resumenCell = sheet.getCell(`A${resumenRow.number}`);
    resumenCell.font = { bold: true, size: 14 };
    resumenCell.alignment = { horizontal: 'center' };

    // -- Sección de totales detallados --
    const inicioResumen = sheet.lastRow.number + 1;
    sheet.addRow(['GANANCIAS', 'Valor']);
    sheet.addRow(['Total Reservas', totalReservas]);
    sheet.addRow(['Total Servicios Extra', totalExtras]);
    sheet.addRow(['Total Ganancias', totalGanancias]);

    sheet.addRow([]);
    sheet.addRow(['GASTOS', 'Valor']);
    sheet.addRow(['Total Movimientos Boleta', totalMovBoleta]);
    sheet.addRow(['Total Movimientos Factura', totalMovFactura]);
    sheet.addRow(['Total Movimientos Otro', totalMovOtro]);
    sheet.addRow(['Total Gastos Boleta', totalGastBoleta]);
    sheet.addRow(['Total Gastos Factura', totalGastFactura]);
    sheet.addRow(['Total Gastos Otro', totalGastOtro]);
    sheet.addRow(['Total Gastos', totalGastos]);

    sheet.addRow([]);
    const balanceFinal = totalGanancias - totalGastos;
    const finalRow = sheet.addRow(['BALANCE FINAL', balanceFinal]);

    // Formatear la celda del balance final
    const finalBalanceCell = sheet.getCell(`B${finalRow.number}`);
    finalBalanceCell.font = {
      bold: true,
      size: 12,
      color: { argb: balanceFinal >= 0 ? 'FF008000' : 'FFFF0000' },
    };
    finalBalanceCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFEFEFEF' },
    };

    // -- SECCIÓN DE BALANCE NETO --
    sheet.addRow([]);
    sheet.addRow([]);
    const balanceNetoTitle = `BALANCE NETO FISCAL - ${monthNames[month]} ${year}`;
    sheet.mergeCells(
      `A${sheet.lastRow.number + 1}:E${sheet.lastRow.number + 1}`,
    );
    const balanceNetoTitleRow = sheet.addRow([balanceNetoTitle]);
    const balanceNetoTitleCell = sheet.getCell(
      `A${balanceNetoTitleRow.number}`,
    );
    balanceNetoTitleCell.font = { bold: true, size: 14 };
    balanceNetoTitleCell.alignment = { horizontal: 'center' };

    // Definición de tasas impositivas
    const igvRate = 0.18; // 18% de IGV
    const impuestoRentaRate = 0.15; // 15% de Impuesto a la Renta
    const igvDivisor = 1 + igvRate; // Para extraer el IGV (1.18)

    // SECCIÓN DE INGRESOS
    let currentRow = sheet.lastRow.number + 1;
    const ingresosTitleRow = sheet.addRow([
      'DETALLE DE INGRESOS CON IMPUESTOS',
      'Valor',
    ]);
    ingresosTitleRow.getCell(1).font = { bold: true };
    ingresosTitleRow.getCell(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE6FFE6' }, // Verde claro para ingresos
    };
    ingresosTitleRow.getCell(2).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE6FFE6' },
    };
    currentRow++;

    // Cálculo del IGV para las reservas (extrayendo el IGV)
    const reservasSinIGV = totalReservas / igvDivisor;
    const igvReservas = totalReservas - reservasSinIGV;

    // Total Reservas con desglose
    sheet.addRow(['Total Reservas (con IGV)', totalReservas]);
    currentRow++;
    sheet.addRow(['IGV de Reservas', igvReservas]);
    currentRow++;
    sheet.addRow(['Total Reservas (sin IGV)', reservasSinIGV]);
    currentRow++;

    // Total Servicios Extra (no tienen IGV)
    sheet.addRow(['Total Servicios Extra', totalExtras]);
    currentRow++;

    // Total Ingresos sin IGV
    const ingresosSinIGV = reservasSinIGV + totalExtras;
    sheet.addRow(['Total Ingresos (sin IGV)', ingresosSinIGV]);
    currentRow++;

    // Total Ingresos con IGV
    const ingresosConIGV = totalReservas + totalExtras;
    const ingresosIGVRow = sheet.addRow([
      'Total Ingresos (con IGV)',
      ingresosConIGV,
    ]);
    ingresosIGVRow.getCell(1).font = { bold: true };
    ingresosIGVRow.getCell(2).font = { bold: true };
    currentRow++;

    sheet.addRow([]);
    currentRow++;

    // SECCIÓN DE GASTOS
    const gastosTitleRow = sheet.addRow([
      'DETALLE DE GASTOS CON IMPUESTOS',
      'Valor',
    ]);
    gastosTitleRow.getCell(1).font = { bold: true };
    gastosTitleRow.getCell(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFFE6E6' }, // Rojo claro para gastos
    };
    gastosTitleRow.getCell(2).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFFE6E6' },
    };
    currentRow++;

    // Extracción del IGV de los gastos totales
    const gastosSinIGV = totalGastos / igvDivisor;
    const igvGastos = totalGastos - gastosSinIGV;

    // Desglose de gastos
    sheet.addRow(['Total Gastos (con IGV)', totalGastos]);
    currentRow++;
    sheet.addRow(['IGV de Gastos', igvGastos]);
    currentRow++;
    sheet.addRow(['Total Gastos (sin IGV)', gastosSinIGV]);
    currentRow++;

    const gastosIGVRow = sheet.addRow(['Total Gastos (con IGV)', totalGastos]);
    gastosIGVRow.getCell(1).font = { bold: true };
    gastosIGVRow.getCell(2).font = { bold: true };
    currentRow++;

    sheet.addRow([]);
    currentRow++;

    // SECCIÓN DE CÁLCULOS FISCALES
    const fiscalTitleRow = sheet.addRow(['CÁLCULO DE IMPUESTOS', 'Valor']);
    fiscalTitleRow.getCell(1).font = { bold: true };
    fiscalTitleRow.getCell(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE6E6FF' }, // Azul claro para impuestos
    };
    fiscalTitleRow.getCell(2).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE6E6FF' },
    };
    currentRow++;

    // Balance antes de impuestos (utilidad bruta sin IGV)
    const balanceAntesImpuestos = ingresosSinIGV - gastosSinIGV;
    sheet.addRow([
      'Balance antes de impuestos (sin IGV)',
      balanceAntesImpuestos,
    ]);
    currentRow++;

    // IGV a pagar (diferencia entre IGV por ingresos e IGV por gastos)
    const igvAPagar = igvReservas - igvGastos;
    const igvAPagarRow = sheet.addRow(['IGV a Pagar/Favor', igvAPagar]);
    if (igvAPagar < 0) {
      igvAPagarRow.getCell(2).font = { color: { argb: 'FF008000' } }; // Verde si es a favor
    } else {
      igvAPagarRow.getCell(2).font = { color: { argb: 'FFFF0000' } }; // Rojo si es a pagar
    }
    currentRow++;

    // Impuesto a la renta (aplica sobre el balance positivo sin IGV)
    const impuestoRenta =
      balanceAntesImpuestos > 0 ? balanceAntesImpuestos * impuestoRentaRate : 0;
    sheet.addRow(['Impuesto a la Renta (15%)', impuestoRenta]);
    currentRow++;

    // Total impuestos a pagar
    const totalImpuestos = (igvAPagar > 0 ? igvAPagar : 0) + impuestoRenta;
    const impuestosTotalRow = sheet.addRow([
      'Total Impuestos a Pagar',
      totalImpuestos,
    ]);
    impuestosTotalRow.getCell(1).font = { bold: true };
    impuestosTotalRow.getCell(2).font = {
      bold: true,
      color: { argb: 'FFFF0000' }, // Rojo para impuestos a pagar
    };
    currentRow++;

    sheet.addRow([]);
    currentRow++;

    // RESULTADO FINAL CON IMPUESTOS
    const resultadoFinalRow = sheet.addRow(['BALANCE NETO FINAL', '']);
    resultadoFinalRow.getCell(1).font = { bold: true, size: 12 };
    resultadoFinalRow.getCell(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFDADAFF' }, // Púrpura claro para resultado
    };
    resultadoFinalRow.getCell(2).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFDADAFF' },
    };
    currentRow++;

    // Balance neto final (después de impuestos)
    const balanceNetoFinal = balanceAntesImpuestos - totalImpuestos;
    const netoFinalRow = sheet.addRow([
      'Balance Neto (después de impuestos)',
      balanceNetoFinal,
    ]);
    netoFinalRow.getCell(1).font = { bold: true };
    netoFinalRow.getCell(2).font = {
      bold: true,
      size: 12,
      color: { argb: balanceNetoFinal >= 0 ? 'FF008000' : 'FFFF0000' },
    };
    netoFinalRow.getCell(2).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFEEEEFF' }, // Fondo más intenso para destacar
    };
    currentRow++;

    // Balance con IGV
    const balanceConIGV = ingresosConIGV - totalGastos;
    sheet.addRow(['Balance con IGV incluido', balanceConIGV]);
    currentRow++;

    // Aplicar formato de moneda a todos los valores numéricos del resumen
    for (let row = inicioResumen + 1; row <= currentRow; row++) {
      const cell = sheet.getCell(`B${row}`);
      if (typeof cell.value === 'number') {
        cell.numFmt = '"S/ "#,##0.00';
      }
    }

    // -- Formato de moneda para valores monetarios en la tabla principal --
    for (let i = 5; i <= diasEnMes + 5; i++) {
      // Solo filas de datos
      [3, 4, 5, 7, 8, 9, 10, 11, 12, 13, 14].forEach((j) => {
        // Columnas con montos
        const cell = sheet.getCell(i, j);
        if (typeof cell.value === 'number') {
          cell.numFmt = '"S/ "#,##0.00';
        }
      });
    }

    // -- Ajustar ancho de columnas --
    sheet.columns.forEach((column, index) => {
      if (index === 0) {
        // Columna de fecha
        column.width = 30;
        column.alignment = { horizontal: 'left' };
      } else if (index === 5) {
        // Columna separadora
        column.width = 4;
      } else if (index === 1) {
        // Columna de descripción en el resumen
        column.width = 40;
      } else {
        column.width = 16;
      }
    });

    return workbook;
  }
}
