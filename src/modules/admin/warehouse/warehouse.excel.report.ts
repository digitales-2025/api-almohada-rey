import { Injectable, Logger } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { WarehouseData } from 'src/interfaces';
import { colors } from 'src/utils/colors/colors.utils';

@Injectable()
export class WarehouseExcelReport {
  private readonly logger = new Logger(WarehouseExcelReport.name);

  // Stock mínimo según el tipo de almacén
  private readonly MIN_STOCK = {
    COMMERCIAL: 15, // Stock mínimo para productos comerciales (de venta)
    INTERNAL_USE: 25, // Stock mínimo para productos de uso interno
    DEPOSIT: 50, // Stock mínimo para productos de depósito
  };

  /**
   * Determina el stock mínimo según el tipo de almacén
   */
  private getMinStockThreshold(warehouseType: string): number {
    return this.MIN_STOCK[warehouseType] || this.MIN_STOCK.INTERNAL_USE; // Valor por defecto
  }

  /**
   * Determina el estado del stock basado en la cantidad y el tipo de almacén
   */
  private determineStockStatus(
    quantity: number,
    warehouseType: string,
  ): string {
    const threshold = this.getMinStockThreshold(warehouseType);

    if (quantity < threshold / 1.5) {
      return 'BAJO';
    } else if (quantity >= threshold / 1.5 && quantity < threshold) {
      return 'MEDIO';
    } else {
      return 'ÓPTIMO';
    }
  }
  /**
   * Genera un informe Excel del stock de un almacén con diseño corporativo mejorado
   */
  async generateStockReport(
    warehouseData: WarehouseData,
  ): Promise<ExcelJS.Workbook> {
    try {
      const workbook = new ExcelJS.Workbook();

      // Metadatos corporativos
      workbook.creator = 'Hotel La Almohada del Rey';
      workbook.company = 'Hotel La Almohada del Rey';
      workbook.subject = 'Reporte de Stock de Almacén';
      workbook.description = `Reporte detallado del stock del almacén ${warehouseData.code}`;
      workbook.created = new Date();
      workbook.modified = new Date();

      const worksheet = workbook.addWorksheet('Reporte de Stock', {
        properties: {
          tabColor: { argb: colors.PRIMARY },
        },
        pageSetup: {
          paperSize: 9, // A4
          orientation: 'landscape',
          fitToPage: true,
          margins: {
            left: 0.7,
            right: 0.7,
            top: 0.75,
            bottom: 0.75,
            header: 0.3,
            footer: 0.3,
          },
        },
      });

      // Configuración avanzada de la hoja
      worksheet.properties.defaultRowHeight = 22;

      // === SECCIÓN DE ENCABEZADO CORPORATIVO ===

      // Fila 1: Espacio superior
      worksheet.addRow([]);
      worksheet.getRow(1).height = 10;

      // Fila 2: Título principal con diseño corporativo
      const titleRow = worksheet.addRow(['HOTEL LA ALMOHADA DEL REY']);
      worksheet.mergeCells('A2:G2');
      const titleCell = worksheet.getCell('A2');
      titleCell.font = {
        bold: true,
        size: 24,
        color: { argb: colors.WHITE },
        name: 'Calibri',
      };
      titleCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: colors.SECONDARY },
      };
      titleCell.alignment = {
        horizontal: 'center',
        vertical: 'middle',
      };
      titleCell.border = {
        top: { style: 'thick', color: { argb: colors.PRIMARY } },
        bottom: { style: 'thick', color: { argb: colors.PRIMARY } },
        left: { style: 'thick', color: { argb: colors.PRIMARY } },
        right: { style: 'thick', color: { argb: colors.PRIMARY } },
      };
      titleRow.height = 35;

      // Fila 3: Subtítulo del reporte
      const fecha = new Date();
      const dia = fecha.getDate().toString().padStart(2, '0');
      const meses = [
        'enero',
        'febrero',
        'marzo',
        'abril',
        'mayo',
        'junio',
        'julio',
        'agosto',
        'septiembre',
        'octubre',
        'noviembre',
        'diciembre',
      ];
      const mes = meses[fecha.getMonth()];
      const anio = fecha.getFullYear();
      const currentDate = `${dia} de ${mes} de ${anio}`;

      const subtitleRow = worksheet.addRow([
        `REPORTE DE INVENTARIO - ALMACÉN ${warehouseData.code}`,
      ]);
      worksheet.mergeCells('A3:G3');
      const subtitleCell = worksheet.getCell('A3');
      subtitleCell.font = {
        bold: true,
        size: 14,
        color: { argb: colors.PRIMARY },
        name: 'Calibri',
      };
      subtitleCell.alignment = { horizontal: 'center', vertical: 'middle' };
      subtitleCell.border = {
        left: { style: 'thick', color: { argb: colors.PRIMARY } },
        right: { style: 'thick', color: { argb: colors.PRIMARY } },
        bottom: { style: 'thin', color: { argb: colors.BORDER } },
      };
      subtitleRow.height = 25;

      // Fila 4: Fecha de generación
      const dateRow = worksheet.addRow([`Generado el ${currentDate}`]);
      worksheet.mergeCells('A4:G4');
      const dateCell = worksheet.getCell('A4');
      dateCell.font = {
        italic: true,
        size: 11,
        color: { argb: colors.MEDIUM_GRAY },
        name: 'Calibri',
      };
      dateCell.alignment = { horizontal: 'center', vertical: 'middle' };
      dateCell.border = {
        left: { style: 'thick', color: { argb: colors.PRIMARY } },
        right: { style: 'thick', color: { argb: colors.PRIMARY } },
        bottom: { style: 'thick', color: { argb: colors.PRIMARY } },
      };
      dateRow.height = 20;

      // === SECCIÓN DE INFORMACIÓN DEL ALMACÉN ===

      // Fila 5: Espacio
      worksheet.addRow([]);
      worksheet.getRow(5).height = 15;

      // Fila 6: Encabezado de información
      const infoHeaderRow = worksheet.addRow(['INFORMACIÓN DEL ALMACÉN']);
      worksheet.mergeCells('A6:G6');
      const infoHeaderCell = worksheet.getCell('A6');
      infoHeaderCell.font = {
        bold: true,
        size: 12,
        color: { argb: colors.WHITE },
        name: 'Calibri',
      };
      infoHeaderCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: colors.PRIMARY },
      };
      infoHeaderCell.alignment = { horizontal: 'center', vertical: 'middle' };
      infoHeaderCell.border = {
        top: { style: 'medium', color: { argb: colors.PRIMARY } },
        bottom: { style: 'medium', color: { argb: colors.PRIMARY } },
        left: { style: 'medium', color: { argb: colors.PRIMARY } },
        right: { style: 'medium', color: { argb: colors.PRIMARY } },
      };
      infoHeaderRow.height = 25;

      // Fila 7: Datos del almacén en formato elegante
      const infoRow = worksheet.addRow([
        'Código:',
        warehouseData.code,
        '',
        'Tipo:',
        this.formatWarehouseType(warehouseData.type),
        '',
        '',
      ]);

      // Estilo para etiquetas
      [1, 4].forEach((col) => {
        const cell = worksheet.getCell(7, col);
        cell.font = {
          bold: true,
          color: { argb: colors.SECONDARY },
          name: 'Calibri',
        };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: colors.LIGHT_GRAY },
        };
        cell.border = {
          top: { style: 'thin', color: { argb: colors.BORDER } },
          bottom: { style: 'thin', color: { argb: colors.BORDER } },
          left: { style: 'medium', color: { argb: colors.PRIMARY } },
          right: { style: 'thin', color: { argb: colors.BORDER } },
        };
      });

      // Estilo para valores
      [2, 5].forEach((col) => {
        const cell = worksheet.getCell(7, col);
        cell.font = {
          color: { argb: colors.SECONDARY },
          name: 'Calibri',
        };
        cell.border = {
          top: { style: 'thin', color: { argb: colors.BORDER } },
          bottom: { style: 'thin', color: { argb: colors.BORDER } },
          left: { style: 'thin', color: { argb: colors.BORDER } },
          right: { style: 'thin', color: { argb: colors.BORDER } },
        };
      });

      // Bordes para celdas vacías
      [3, 6, 7].forEach((col) => {
        const cell = worksheet.getCell(7, col);
        cell.border = {
          top: { style: 'thin', color: { argb: colors.BORDER } },
          bottom: { style: 'thin', color: { argb: colors.BORDER } },
          right:
            col === 7
              ? { style: 'medium', color: { argb: colors.PRIMARY } }
              : { style: 'thin', color: { argb: colors.BORDER } },
        };
      });

      infoRow.height = 22;

      // === SECCIÓN DE TABLA DE DATOS ===

      // Fila 8: Espacio
      worksheet.addRow([]);
      worksheet.getRow(8).height = 15;

      // Fila 9: Encabezado de tabla
      const tableHeaderRow = worksheet.addRow(['DETALLE DE INVENTARIO']);
      worksheet.mergeCells('A9:G9');
      const tableHeaderCell = worksheet.getCell('A9');
      tableHeaderCell.font = {
        bold: true,
        size: 12,
        color: { argb: colors.WHITE },
        name: 'Calibri',
      };
      tableHeaderCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: colors.SECONDARY },
      };
      tableHeaderCell.alignment = { horizontal: 'center', vertical: 'middle' };
      tableHeaderCell.border = {
        top: { style: 'medium', color: { argb: colors.SECONDARY } },
        bottom: { style: 'medium', color: { argb: colors.SECONDARY } },
        left: { style: 'medium', color: { argb: colors.SECONDARY } },
        right: { style: 'medium', color: { argb: colors.SECONDARY } },
      };
      tableHeaderRow.height = 25;

      // Fila 10: Cabeceras de columnas
      const headerRow = worksheet.addRow([
        'CÓDIGO',
        'PRODUCTO',
        'CANTIDAD',
        'COSTO UNIT.',
        'COSTO TOTAL',
        'ESTADO',
        'OBSERVACIONES',
      ]);

      // Estilo de cabeceras de columnas
      headerRow.height = 28;
      headerRow.eachCell((cell) => {
        cell.font = {
          bold: true,
          color: { argb: colors.WHITE },
          size: 11,
          name: 'Calibri',
        };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: colors.PRIMARY },
        };
        cell.border = {
          top: { style: 'medium', color: { argb: colors.PRIMARY } },
          left: { style: 'thin', color: { argb: colors.WHITE } },
          bottom: { style: 'medium', color: { argb: colors.PRIMARY } },
          right: { style: 'thin', color: { argb: colors.WHITE } },
        };
        cell.alignment = {
          horizontal: 'center',
          vertical: 'middle',
          wrapText: true,
        };
      });

      // === DATOS DE STOCK ===
      let totalQuantity = 0;
      let totalCost = 0;
      const startDataRow = 11;

      warehouseData.stock.forEach((item, index) => {
        // Determinar estado del stock basado en el tipo de almacén
        const stockStatus = this.determineStockStatus(
          item.quantity,
          warehouseData.type,
        );

        const dataRow = worksheet.addRow([
          item.product.code || 'N/A',
          item.product.name,
          item.quantity,
          item.unitCost,
          item.totalCost,
          stockStatus,
          '', // Observaciones vacías
        ]);

        totalQuantity += item.quantity;
        totalCost += item.totalCost;

        // Estilo alternado para filas
        const isEven = index % 2 === 0;
        const rowColor = isEven ? colors.WHITE : colors.LIGHT_GRAY;

        dataRow.height = 24;
        dataRow.eachCell((cell, colNumber) => {
          // Configuración base para todas las celdas
          cell.border = {
            top: { style: 'thin', color: { argb: colors.BORDER } },
            left: { style: 'thin', color: { argb: colors.BORDER } },
            bottom: { style: 'thin', color: { argb: colors.BORDER } },
            right: { style: 'thin', color: { argb: colors.BORDER } },
          };

          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: rowColor },
          };

          cell.font = {
            color: { argb: colors.SECONDARY },
            name: 'Calibri',
          };

          // Configuración específica por columna
          switch (colNumber) {
            case 1: // Código
              cell.alignment = { horizontal: 'center', vertical: 'middle' };
              cell.font = { ...cell.font, bold: true };
              break;
            case 2: // Producto
              cell.alignment = { horizontal: 'left', vertical: 'middle' };
              break;
            case 3: // Cantidad
              cell.alignment = { horizontal: 'center', vertical: 'middle' };
              cell.font = { ...cell.font, bold: true };
              break;
            case 4: // Costo unitario
            case 5: // Costo total
              cell.numFmt = '"S/ "#,##0.00';
              cell.alignment = { horizontal: 'right', vertical: 'middle' };
              break;
            case 6: // Estado
              cell.alignment = { horizontal: 'center', vertical: 'middle' };
              cell.font = { ...cell.font, bold: true };
              // Color según estado
              if (stockStatus === 'ÓPTIMO') {
                cell.font = {
                  ...cell.font,
                  color: { argb: colors.SUCCESS },
                };
              } else if (stockStatus === 'BAJO') {
                cell.font = {
                  ...cell.font,
                  color: { argb: colors.WARNING },
                };
              } else {
                cell.font = {
                  ...cell.font,
                  color: { argb: colors.PRIMARY },
                };
              }
              break;
            case 7: // Observaciones
              cell.alignment = { horizontal: 'left', vertical: 'middle' };
              break;
          }
        });
      });

      // === FILA DE TOTALES ===
      const totalRowNum = startDataRow + warehouseData.stock.length;
      const totalRow = worksheet.addRow([
        '',
        'TOTALES',
        totalQuantity,
        '',
        totalCost,
        '',
        '',
      ]);

      // Combinar celdas para el texto "TOTALES"
      worksheet.mergeCells(`A${totalRowNum}:B${totalRowNum}`);

      // Estilo de la fila de totales
      totalRow.height = 30;
      totalRow.eachCell((cell, colNumber) => {
        cell.font = {
          bold: true,
          color: { argb: colors.WHITE },
          size: 12,
          name: 'Calibri',
        };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: colors.SECONDARY },
        };
        cell.border = {
          top: { style: 'double', color: { argb: colors.PRIMARY } },
          left: { style: 'medium', color: { argb: colors.PRIMARY } },
          bottom: { style: 'double', color: { argb: colors.PRIMARY } },
          right: { style: 'medium', color: { argb: colors.PRIMARY } },
        };

        if (colNumber === 1) {
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
          cell.value = 'TOTALES';
        } else if (colNumber === 3) {
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        } else if (colNumber === 5) {
          cell.numFmt = '"S/ "#,##0.00';
          cell.alignment = { horizontal: 'right', vertical: 'middle' };
        } else {
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        }
      });

      // === RESUMEN ESTADÍSTICO ===
      const statsRowNum = totalRowNum + 1.5;

      // Encabezado de estadísticas
      const statsHeaderRow = worksheet.addRow(['RESUMEN EJECUTIVO']);
      worksheet.mergeCells(`A${statsRowNum}:G${statsRowNum}`);
      const statsHeaderCell = worksheet.getCell(`A${statsRowNum}`);
      statsHeaderCell.font = {
        bold: true,
        size: 12,
        color: { argb: colors.PRIMARY }, // Cambio a color principal
        name: 'Calibri',
      };
      statsHeaderCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: colors.WHITE }, // Cambio a fondo blanco
      };
      statsHeaderCell.alignment = { horizontal: 'center', vertical: 'middle' };
      statsHeaderCell.border = {
        top: { style: 'medium', color: { argb: colors.PRIMARY } },
        bottom: { style: 'medium', color: { argb: colors.PRIMARY } },
        left: { style: 'medium', color: { argb: colors.PRIMARY } },
        right: { style: 'medium', color: { argb: colors.PRIMARY } },
      };
      statsHeaderRow.height = 25;

      // Datos estadísticos
      const avgCost =
        warehouseData.stock.length > 0 ? totalCost / totalQuantity : 0;
      const threshold = this.getMinStockThreshold(warehouseData.type);
      const lowStockItems = warehouseData.stock.filter(
        (item) => item.quantity <= threshold,
      ).length;

      const statsRow = worksheet.addRow([
        'Productos:',
        warehouseData.stock.length,
        'Stock Bajo:',
        lowStockItems,
        'Promedio:',
        `S/ ${avgCost.toFixed(2)}`,
        '',
      ]);

      // Estilo para estadísticas
      statsRow.height = 22;
      [1, 3, 5].forEach((col) => {
        const cell = worksheet.getCell(statsRowNum + 1, col);
        cell.font = {
          bold: true,
          color: { argb: colors.SECONDARY },
          name: 'Calibri',
        };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: colors.LIGHT_GOLD },
        };
        cell.border = {
          top: { style: 'thin', color: { argb: colors.BORDER } },
          bottom: { style: 'thin', color: { argb: colors.BORDER } },
          left: { style: 'medium', color: { argb: colors.PRIMARY } },
          right: { style: 'thin', color: { argb: colors.BORDER } },
        };
      });

      [2, 4, 6].forEach((col) => {
        const cell = worksheet.getCell(statsRowNum + 1, col);
        cell.font = {
          bold: true,
          color: { argb: colors.PRIMARY },
          name: 'Calibri',
        };
        cell.border = {
          top: { style: 'thin', color: { argb: colors.BORDER } },
          bottom: { style: 'thin', color: { argb: colors.BORDER } },
          left: { style: 'thin', color: { argb: colors.BORDER } },
          right:
            col === 6
              ? { style: 'medium', color: { argb: colors.PRIMARY } }
              : { style: 'thin', color: { argb: colors.BORDER } },
        };
      });

      // === CONFIGURACIÓN DE COLUMNAS ===
      worksheet.getColumn(1).width = 13; // Código
      worksheet.getColumn(2).width = 35; // Producto
      worksheet.getColumn(3).width = 10; // Cantidad
      worksheet.getColumn(4).width = 12; // Costo unitario
      worksheet.getColumn(5).width = 12; // Costo total
      worksheet.getColumn(6).width = 10; // Estado
      worksheet.getColumn(7).width = 20; // Observaciones

      // === PIE DE PÁGINA CORPORATIVO ===
      const footerRowNum = statsRowNum + 2;

      // Línea separadora
      worksheet.mergeCells(`A${footerRowNum}:G${footerRowNum}`);
      const separatorCell = worksheet.getCell(`A${footerRowNum}`);
      separatorCell.border = {
        top: { style: 'medium', color: { argb: colors.PRIMARY } },
      };

      // Información de la empresa
      // Agregar pie de página con información adicional y logo
      const lastRow = worksheet.lastRow.number + 1;
      worksheet.mergeCells(`A${lastRow}:G${lastRow}`);
      const footerCell = worksheet.getCell(`A${lastRow}`);
      footerCell.value =
        'Hotel La Almohada del Rey - Sistema de Gestión de Inventario';
      footerCell.font = {
        italic: true,
        size: 12,
        color: { argb: colors.MEDIUM_GRAY },
        name: 'Calibri',
      };
      footerCell.alignment = { horizontal: 'center' };

      // Añadir fecha y hora de generación
      const timestampRow = lastRow + 1;
      worksheet.mergeCells(`A${timestampRow}:G${timestampRow}`);
      const timestampCell = worksheet.getCell(`A${timestampRow}`);
      const now = new Date();
      timestampCell.value = `Generado el: ${now.toLocaleDateString()} a las ${now.toLocaleTimeString()}`;
      timestampCell.font = {
        italic: true,
        size: 11,
        color: { argb: colors.MEDIUM_GRAY },
        name: 'Calibri',
      };
      timestampCell.alignment = { horizontal: 'center' };

      return workbook;
    } catch (error) {
      this.logger.error(
        'Error generating enhanced warehouse stock report',
        error,
      );
      throw new Error('Error al generar el reporte de stock del almacén');
    }
  }

  /**
   * Formatea el tipo de almacén a un texto más descriptivo
   */
  private formatWarehouseType(type: string): string {
    const types = {
      COMMERCIAL: 'Comercial',
      INTERNAL_USE: 'Uso Interno',
      DEPOSIT: 'Depósito',
      MAIN: 'Principal',
      SECONDARY: 'Secundario',
    };

    return types[type] || type;
  }
}
