import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { BalanceData } from '../interfaces/balance';
import { colors } from 'src/utils/colors/colors.utils';

@Injectable()
export class BalanceReportUseCase {
  async execute(
    data: BalanceData,
    { startDate, endDate }: { startDate: string; endDate: string },
  ): Promise<ExcelJS.Workbook> {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Balance');

    // -- Título principal --
    const title = `Balance de Ganancias y Gastos - ${startDate} a ${endDate}`;
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
        cell.font = {
          bold: true,
          size: 12,
          color: { argb: colors.headerText },
        };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: `FF${colors.SUCCESS}` },
        };
        sheet.mergeCells(`B${subtituloRow.number}:E${subtituloRow.number}`);
      } else if (colNumber === 7) {
        // GASTOS
        cell.font = {
          bold: true,
          size: 12,
          color: { argb: colors.headerText },
        };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: `FF${colors.WARNING}` },
        };
        sheet.mergeCells(`G${subtituloRow.number}:M${subtituloRow.number}`);
      } else if (colNumber === 14) {
        // BALANCE
        cell.font = {
          bold: true,
          size: 12,
          color: { argb: colors.headerText },
        };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: `FF${colors.PRIMARY}` },
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

    // -- Generar días del rango de fechas --
    const start = new Date(startDate + 'T00:00:00');
    const end = new Date(endDate + 'T00:00:00');
    const current = new Date(start);

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

        // Mergear celdas para el separador de mes (balance tiene más columnas)
        sheet.mergeCells(`A${monthRow.number}:N${monthRow.number}`);

        currentMonth = month;
      }

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

      // Avanzar al siguiente día
      current.setDate(current.getDate() + 1);
    }

    // Agregar totales del último mes
    if (currentMonth !== null) {
      this.addMonthTotals(sheet, monthNames[currentMonth]);
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
    const resumenTitle = `RESUMEN DE BALANCE - ${startDate} a ${endDate}`;
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
    const balanceNetoTitle = `BALANCE NETO FISCAL - ${startDate} a ${endDate}`;
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
    const impuestoRentaRate = 0.015; // 0.015% de Impuesto a la Renta
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

    // --- DETALLE DE IGV ---
    // IGV a pagar (diferencia entre IGV por ingresos e IGV por gastos)
    const igvAPagar = igvReservas - igvGastos;

    // Mostrar IGV de ingresos
    sheet.addRow(['IGV de Ingresos', igvReservas]);
    currentRow++;

    // Mostrar IGV de gastos (como valor negativo para la resta)
    const igvGastosRow = sheet.addRow([
      'IGV de Gastos (a deducir)',
      -igvGastos,
    ]);
    igvGastosRow.getCell(2).font = { color: { argb: 'FF008000' } }; // Verde para valores a favor
    currentRow++;

    // Subtotal IGV a pagar
    const igvAPagarRow = sheet.addRow(['IGV a Pagar/Favor', igvAPagar]);
    if (igvAPagar < 0) {
      igvAPagarRow.getCell(2).font = { color: { argb: 'FF008000' } }; // Verde si es a favor
    } else {
      igvAPagarRow.getCell(2).font = { color: { argb: 'FFFF0000' } }; // Rojo si es a pagar
    }
    igvAPagarRow.getCell(1).font = { bold: true };
    igvAPagarRow.getCell(2).font = {
      bold: true,
      color: { argb: igvAPagar < 0 ? 'FF008000' : 'FFFF0000' },
    };
    currentRow++;

    sheet.addRow([]);
    currentRow++;

    // --- IMPUESTO A LA RENTA ---
    // Mostrar el cálculo del impuesto a la renta
    sheet.addRow([
      'Base imponible para IR',
      balanceAntesImpuestos > 0 ? balanceAntesImpuestos : 0,
    ]);
    currentRow++;

    sheet.addRow(['Tasa de Impuesto a la Renta', '0.015%']);
    currentRow++;

    // Impuesto a la renta (aplica solo sobre el balance positivo sin IGV)
    const impuestoRenta =
      balanceAntesImpuestos > 0 ? balanceAntesImpuestos * impuestoRentaRate : 0;
    const impuestoRentaRow = sheet.addRow([
      'Impuesto a la Renta (0.015%)',
      impuestoRenta,
    ]);
    impuestoRentaRow.getCell(1).font = { bold: true };
    impuestoRentaRow.getCell(2).font = {
      bold: true,
      color: { argb: 'FFFF0000' }, // Rojo para impuestos a pagar
    };
    currentRow++;

    sheet.addRow([]);
    currentRow++;

    // --- TOTAL IMPUESTOS A PAGAR ---
    // Solo se considera IGV a pagar cuando es positivo
    const igvAPagarPositivo = igvAPagar > 0 ? igvAPagar : 0;

    // Mostrar IGV a pagar (solo si es positivo)
    if (igvAPagar > 0) {
      sheet.addRow(['IGV a pagar', igvAPagarPositivo]);
      currentRow++;
    } else {
      sheet.addRow(['IGV a pagar', 0]);
      currentRow++;
      sheet.addRow(['IGV a favor (crédito fiscal)', Math.abs(igvAPagar)]);
      currentRow++;
    }

    // Mostrar Impuesto a la Renta
    sheet.addRow(['Impuesto a la Renta a pagar', impuestoRenta]);
    currentRow++;

    // Total impuestos a pagar (sumando IGV positivo e IR)
    const totalImpuestos = igvAPagarPositivo + impuestoRenta;
    const impuestosTotalRow = sheet.addRow([
      'Total Impuestos a Pagar',
      totalImpuestos,
    ]);
    impuestosTotalRow.getCell(1).font = { bold: true };
    impuestosTotalRow.getCell(2).font = {
      bold: true,
      color: { argb: 'FFFF0000' }, // Rojo para impuestos a pagar
    };
    impuestosTotalRow.getCell(2).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFEEEEFF' }, // Fondo más intenso para destacar
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
      fgColor: { argb: `FF${colors.PRIMARY}` }, // Dorado corporativo para resultado
    };
    resultadoFinalRow.getCell(2).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: `FF${colors.PRIMARY}` },
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
    const daysInRange = Math.ceil(
      (new Date(endDate).getTime() - new Date(startDate).getTime()) /
        (1000 * 60 * 60 * 24),
    );
    for (let i = 5; i <= daysInRange + 5; i++) {
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

  /**
   * Genera un reporte comparativo de balance entre dos años
   * @param data1 Datos del primer año
   * @param data2 Datos del segundo año
   * @param years Años a comparar
   * @returns Workbook con 3 hojas: Resumen Comparativo, Detalle Año 1, Detalle Año 2
   */
  async executeCompare(
    data1: BalanceData,
    data2: BalanceData,
    { year1, year2 }: { year1: number; year2: number },
  ): Promise<ExcelJS.Workbook> {
    const workbook = new ExcelJS.Workbook();

    // Hoja 1: Resumen Comparativo
    const summarySheet = workbook.addWorksheet('Resumen Comparativo');
    this.createBalanceComparisonSummary(
      summarySheet,
      data1,
      data2,
      year1,
      year2,
    );

    // Hoja 2: Detalle Año 1
    const detailSheet1 = workbook.addWorksheet(`Detalle ${year1}`);
    this.createBalanceDetailSheet(detailSheet1, data1, year1);

    // Hoja 3: Detalle Año 2
    const detailSheet2 = workbook.addWorksheet(`Detalle ${year2}`);
    this.createBalanceDetailSheet(detailSheet2, data2, year2);

    return workbook;
  }

  private createBalanceComparisonSummary(
    sheet: ExcelJS.Worksheet,
    data1: BalanceData,
    data2: BalanceData,
    year1: number,
    year2: number,
  ) {
    // Título principal
    sheet.mergeCells('A1:F1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = `Reporte Comparativo de Balance - ${year1} vs ${year2}`;
    titleCell.font = { size: 16, bold: true, color: { argb: colors.PRIMARY } };
    titleCell.alignment = { horizontal: 'center' };

    // Subtítulo
    sheet.mergeCells('A2:F2');
    const subtitleCell = sheet.getCell('A2');
    subtitleCell.value = 'Análisis comparativo de ingresos vs gastos';
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
    const concepts = ['Ingresos', 'Gastos', 'Balance'];
    let currentRow = 5;

    concepts.forEach((concept) => {
      const amount1 = this.getTotalByConcept(data1, concept);
      const amount2 = this.getTotalByConcept(data2, concept);
      const difference = amount1 - amount2;
      const variation = amount2 !== 0 ? (difference / amount2) * 100 : 0;
      const trend = this.getTrendIcon(variation, concept);

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

      // Colorear según concepto y tendencia
      if (concept === 'Ingresos') {
        if (variation > 0) {
          row.getCell(4).font = { color: { argb: '00AA00' } }; // Verde para aumento de ingresos
          row.getCell(5).font = { color: { argb: '00AA00' } };
        } else if (variation < 0) {
          row.getCell(4).font = { color: { argb: 'AA0000' } }; // Rojo para disminución de ingresos
          row.getCell(5).font = { color: { argb: 'AA0000' } };
        }
      } else if (concept === 'Gastos') {
        if (variation > 0) {
          row.getCell(4).font = { color: { argb: 'AA0000' } }; // Rojo para aumento de gastos
          row.getCell(5).font = { color: { argb: 'AA0000' } };
        } else if (variation < 0) {
          row.getCell(4).font = { color: { argb: '00AA00' } }; // Verde para reducción de gastos
          row.getCell(5).font = { color: { argb: '00AA00' } };
        }
      } else if (concept === 'Balance') {
        if (variation > 0) {
          row.getCell(4).font = { color: { argb: '00AA00' } }; // Verde para balance positivo
          row.getCell(5).font = { color: { argb: '00AA00' } };
        } else if (variation < 0) {
          row.getCell(4).font = { color: { argb: 'AA0000' } }; // Rojo para balance negativo
          row.getCell(5).font = { color: { argb: 'AA0000' } };
        }
      }

      currentRow++;
    });

    // Fila de totales
    const totalRow = sheet.getRow(currentRow);
    const total1 = this.getTotalAmount(data1);
    const total2 = this.getTotalAmount(data2);
    const totalDiff = total1 - total2;
    const totalVariation = total2 !== 0 ? (totalDiff / total2) * 100 : 0;

    totalRow.getCell(1).value = 'TOTAL BALANCE';
    totalRow.getCell(1).font = { bold: true };
    totalRow.getCell(2).value = total1;
    totalRow.getCell(3).value = total2;
    totalRow.getCell(4).value = totalDiff;
    totalRow.getCell(5).value = totalVariation;
    totalRow.getCell(6).value = this.getTrendIcon(totalVariation, 'Balance');

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

  private createBalanceDetailSheet(
    sheet: ExcelJS.Worksheet,
    data: BalanceData,
    year: number,
  ) {
    // Título
    sheet.mergeCells('A1:F1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = `Reporte de Balance - ${year}`;
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

    // Datos - Combinar profit y expense
    let currentRow = 4;

    // Agregar datos de profit
    data.profit.forEach((item) => {
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

    // Agregar datos de expense
    data.expense.forEach((item) => {
      const row = sheet.getRow(currentRow);
      row.getCell(1).value = item.date;
      row.getCell(2).value = 'Gastos';
      row.getCell(3).value =
        item.description || item.category || 'Sin descripción';
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
      { width: 20 }, // Concepto
      { width: 30 }, // Descripción
      { width: 12 }, // Cantidad
      { width: 15 }, // Precio Unit.
      { width: 15 }, // Total
    ];
  }

  private getTotalByConcept(data: BalanceData, concept: string): number {
    if (concept === 'Ingresos') {
      return data.profit.reduce((sum, item) => sum + item.total, 0);
    } else if (concept === 'Gastos') {
      return data.expense.reduce((sum, item) => sum + item.amount, 0);
    }
    return 0;
  }

  private getTotalAmount(data: BalanceData): number {
    const income = this.getTotalByConcept(data, 'Ingresos');
    const expenses = this.getTotalByConcept(data, 'Gastos');
    return income - expenses; // Balance = Ingresos - Gastos
  }

  private getTrendIcon(variation: number, concept: string): string {
    if (concept === 'Gastos') {
      // Para gastos, menos es mejor
      if (variation < -5) return '📉'; // Reducción de gastos = bueno
      if (variation > 5) return '📈'; // Aumento de gastos = malo
    } else {
      // Para ingresos y balance, más es mejor
      if (variation > 5) return '📈';
      if (variation < -5) return '📉';
    }
    return '➡️';
  }

  private addMonthTotals(sheet: ExcelJS.Worksheet, monthName: string) {
    // Agregar fila de totales del mes
    const totalRow = sheet.addRow(['TOTAL ' + monthName.toUpperCase()]);

    // Mergear celdas para el total del mes (balance tiene más columnas)
    sheet.mergeCells(`A${totalRow.number}:N${totalRow.number}`);

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
