import { Controller, Get, Query, Res } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiQuery,
  ApiOkResponse,
} from '@nestjs/swagger';
import { Auth } from '../../auth/decorators';
import { ReportsService } from '../services/reports.service';
import { Response } from 'express';

@ApiTags('Admin Reports')
@Auth()
@Controller({ path: 'reports', version: '1' })
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  /**
   * Descarga un Excel con el profit (ganancia) del rango de fechas indicado.
   * @param startDate Fecha de inicio (YYYY-MM-DD)
   * @param endDate Fecha de fin (YYYY-MM-DD)
   * @param res Respuesta HTTP para enviar el archivo
   */
  @Get('profit')
  @ApiOperation({
    summary:
      'Descargar Excel de profit por rango de fechas o comparación de años',
    description:
      'Genera y descarga un archivo Excel con el profit. Puede ser por rango de fechas específico o comparación entre dos años.',
  })
  @ApiQuery({
    name: 'startDate',
    description:
      'Fecha de inicio en formato YYYY-MM-DD (requerido si no se usa year1/year2)',
    type: String,
    example: '2024-01-01',
    required: false,
  })
  @ApiQuery({
    name: 'endDate',
    description:
      'Fecha de fin en formato YYYY-MM-DD (requerido si no se usa year1/year2)',
    type: String,
    example: '2024-12-31',
    required: false,
  })
  @ApiQuery({
    name: 'year1',
    description:
      'Primer año a comparar (requerido si no se usa startDate/endDate)',
    type: Number,
    example: 2024,
    required: false,
  })
  @ApiQuery({
    name: 'year2',
    description:
      'Segundo año a comparar (requerido si no se usa startDate/endDate)',
    type: Number,
    example: 2023,
    required: false,
  })
  @ApiOkResponse({
    description: 'Archivo Excel con el profit del rango de fechas',
    schema: { type: 'string', format: 'binary' },
  })
  async downloadProfitExcel(
    @Res() res: Response,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('year1') year1?: number,
    @Query('year2') year2?: number,
  ) {
    // Validar que se proporcionen los parámetros correctos
    const isDateRange = startDate && endDate;
    const isYearComparison = year1 && year2;

    if (!isDateRange && !isYearComparison) {
      throw new Error('Debe proporcionar startDate/endDate o year1/year2');
    }

    if (isDateRange && isYearComparison) {
      throw new Error(
        'No puede proporcionar ambos: rango de fechas y años a comparar',
      );
    }

    // Llama al service para obtener el Excel y lo envía como archivo
    const workbook = isYearComparison
      ? await this.reportsService.getProfitCompareExcel({
          year1,
          year2,
        })
      : await this.reportsService.getProfitExcel({
          startDate,
          endDate,
        });

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );

    const filename = isYearComparison
      ? `profit_compare_${year1}_vs_${year2}.xlsx`
      : `profit_${startDate}_to_${endDate}.xlsx`;

    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    await workbook.xlsx.write(res);
    res.end();
  }

  /**
   * Descarga un Excel con el expense (gasto) del rango de fechas indicado.
   * @param startDate Fecha de inicio (YYYY-MM-DD)
   * @param endDate Fecha de fin (YYYY-MM-DD)
   * @param res Respuesta HTTP para enviar el archivo
   */
  @Get('expense')
  @ApiOperation({
    summary:
      'Descargar Excel de expense por rango de fechas o comparación de años',
    description:
      'Genera y descarga un archivo Excel con el expense. Puede ser por rango de fechas específico o comparación entre dos años.',
  })
  @ApiQuery({
    name: 'startDate',
    description:
      'Fecha de inicio en formato YYYY-MM-DD (requerido si no se usa year1/year2)',
    type: String,
    example: '2024-01-01',
    required: false,
  })
  @ApiQuery({
    name: 'endDate',
    description:
      'Fecha de fin en formato YYYY-MM-DD (requerido si no se usa year1/year2)',
    type: String,
    example: '2024-12-31',
    required: false,
  })
  @ApiQuery({
    name: 'year1',
    description:
      'Primer año a comparar (requerido si no se usa startDate/endDate)',
    type: Number,
    example: 2024,
    required: false,
  })
  @ApiQuery({
    name: 'year2',
    description:
      'Segundo año a comparar (requerido si no se usa startDate/endDate)',
    type: Number,
    example: 2023,
    required: false,
  })
  @ApiOkResponse({
    description: 'Archivo Excel con el expense del rango de fechas',
    schema: { type: 'string', format: 'binary' },
  })
  async downloadExpenseExcel(
    @Res() res: Response,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('year1') year1?: number,
    @Query('year2') year2?: number,
  ) {
    // Validar que se proporcionen los parámetros correctos
    const isDateRange = startDate && endDate;
    const isYearComparison = year1 && year2;

    if (!isDateRange && !isYearComparison) {
      throw new Error('Debe proporcionar startDate/endDate o year1/year2');
    }

    if (isDateRange && isYearComparison) {
      throw new Error(
        'No puede proporcionar ambos: rango de fechas y años a comparar',
      );
    }

    // Llama al service para obtener el Excel y lo envía como archivo
    const workbook = isYearComparison
      ? await this.reportsService.getExpenseCompareExcel({
          year1,
          year2,
        })
      : await this.reportsService.getExpenseExcel({
          startDate,
          endDate,
        });

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );

    const filename = isYearComparison
      ? `expense_compare_${year1}_vs_${year2}.xlsx`
      : `expense_${startDate}_to_${endDate}.xlsx`;

    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    await workbook.xlsx.write(res);
    res.end();
  }

  /**
   * Descarga un Excel con el balance (profit - expense) del rango de fechas indicado.
   * @param startDate Fecha de inicio (YYYY-MM-DD)
   * @param endDate Fecha de fin (YYYY-MM-DD)
   * @param res Respuesta HTTP para enviar el archivo
   */
  @Get('balance')
  @ApiOperation({
    summary:
      'Descargar Excel de balance por rango de fechas o comparación de años',
    description:
      'Genera y descarga un archivo Excel con el balance. Puede ser por rango de fechas específico o comparación entre dos años.',
  })
  @ApiQuery({
    name: 'startDate',
    description:
      'Fecha de inicio en formato YYYY-MM-DD (requerido si no se usa year1/year2)',
    type: String,
    example: '2024-01-01',
    required: false,
  })
  @ApiQuery({
    name: 'endDate',
    description:
      'Fecha de fin en formato YYYY-MM-DD (requerido si no se usa year1/year2)',
    type: String,
    example: '2024-12-31',
    required: false,
  })
  @ApiQuery({
    name: 'year1',
    description:
      'Primer año a comparar (requerido si no se usa startDate/endDate)',
    type: Number,
    example: 2024,
    required: false,
  })
  @ApiQuery({
    name: 'year2',
    description:
      'Segundo año a comparar (requerido si no se usa startDate/endDate)',
    type: Number,
    example: 2023,
    required: false,
  })
  @ApiOkResponse({
    description: 'Archivo Excel con el balance del rango de fechas',
    schema: { type: 'string', format: 'binary' },
  })
  async downloadBalanceExcel(
    @Res() res: Response,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('year1') year1?: number,
    @Query('year2') year2?: number,
  ) {
    // Validar que se proporcionen los parámetros correctos
    const isDateRange = startDate && endDate;
    const isYearComparison = year1 && year2;

    if (!isDateRange && !isYearComparison) {
      throw new Error('Debe proporcionar startDate/endDate o year1/year2');
    }

    if (isDateRange && isYearComparison) {
      throw new Error(
        'No puede proporcionar ambos: rango de fechas y años a comparar',
      );
    }

    // Llama al service para obtener el Excel y lo envía como archivo
    const workbook = isYearComparison
      ? await this.reportsService.getBalanceCompareExcel({
          year1,
          year2,
        })
      : await this.reportsService.getBalanceExcel({
          startDate,
          endDate,
        });

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );

    const filename = isYearComparison
      ? `balance_compare_${year1}_vs_${year2}.xlsx`
      : `balance_${startDate}_to_${endDate}.xlsx`;

    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    await workbook.xlsx.write(res);
    res.end();
  }

  //reportes por tipo de habitación
  @Get('profitRoomType')
  @ApiOperation({
    summary: 'Descargar Excel de ganancias por tipo de habitación',
    description:
      'Genera y descarga un archivo Excel con el profit por tipo de habitación. Puede ser por rango de fechas específico o comparación entre dos años.',
  })
  @ApiQuery({
    name: 'startDate',
    description:
      'Fecha de inicio en formato YYYY-MM-DD (requerido si no se usa year1/year2)',
    type: String,
    example: '2024-01-01',
    required: false,
  })
  @ApiQuery({
    name: 'endDate',
    description:
      'Fecha de fin en formato YYYY-MM-DD (requerido si no se usa year1/year2)',
    type: String,
    example: '2024-12-31',
    required: false,
  })
  @ApiQuery({
    name: 'year1',
    description:
      'Primer año a comparar (requerido si no se usa startDate/endDate)',
    type: Number,
    example: 2024,
    required: false,
  })
  @ApiQuery({
    name: 'year2',
    description:
      'Segundo año a comparar (requerido si no se usa startDate/endDate)',
    type: Number,
    example: 2023,
    required: false,
  })
  @ApiQuery({
    name: 'typeRoomId',
    description: 'ID del tipo de habitación',
    type: String,
    example: 'uuid-del-tipo-habitacion',
    required: true,
  })
  @ApiOkResponse({
    description: 'Archivo Excel con el profit por tipo de habitación',
    schema: { type: 'string', format: 'binary' },
  })
  async downloadProfitTypeRoomExcel(
    @Res() res: Response,
    @Query('typeRoomId') typeRoomId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('year1') year1?: number,
    @Query('year2') year2?: number,
  ) {
    // Validar que se proporcionen los parámetros correctos
    const isDateRange = startDate && endDate;
    const isYearComparison = year1 && year2;

    if (!isDateRange && !isYearComparison) {
      throw new Error('Debe proporcionar startDate/endDate o year1/year2');
    }

    if (isDateRange && isYearComparison) {
      throw new Error(
        'No puede proporcionar ambos: rango de fechas y años a comparar',
      );
    }

    const workbook = isYearComparison
      ? await this.reportsService.getProfitTypeRoomCompareExcel({
          year1,
          year2,
          typeRoomId,
        })
      : await this.reportsService.getProfitTypeRoomExcel({
          startDate,
          endDate,
          typeRoomId,
        });

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );

    const filename = isYearComparison
      ? `profit_roomtype_compare_${year1}_vs_${year2}.xlsx`
      : `profit_roomtype_${startDate}_to_${endDate}.xlsx`;

    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    await workbook.xlsx.write(res);
    res.end();
  }
  /**
   * Descarga un Excel con estadísticas de ocupación por tipo de habitación del rango de fechas indicado.
   * @param startDate Fecha de inicio (YYYY-MM-DD)
   * @param endDate Fecha de fin (YYYY-MM-DD)
   * @param res Respuesta HTTP para enviar el archivo
   */
  @Get('occupancy')
  @ApiOperation({
    summary: 'Descargar Excel de estadísticas de ocupación',
    description:
      'Genera y descarga un archivo Excel con estadísticas de ocupación por tipo de habitación. Puede ser por rango de fechas específico o comparación entre dos años.',
  })
  @ApiQuery({
    name: 'startDate',
    description:
      'Fecha de inicio en formato YYYY-MM-DD (requerido si no se usa year1/year2)',
    type: String,
    example: '2024-01-01',
    required: false,
  })
  @ApiQuery({
    name: 'endDate',
    description:
      'Fecha de fin en formato YYYY-MM-DD (requerido si no se usa year1/year2)',
    type: String,
    example: '2024-12-31',
    required: false,
  })
  @ApiQuery({
    name: 'year1',
    description:
      'Primer año a comparar (requerido si no se usa startDate/endDate)',
    type: Number,
    example: 2024,
    required: false,
  })
  @ApiQuery({
    name: 'year2',
    description:
      'Segundo año a comparar (requerido si no se usa startDate/endDate)',
    type: Number,
    example: 2023,
    required: false,
  })
  @ApiOkResponse({
    description: 'Archivo Excel con estadísticas de ocupación',
    schema: { type: 'string', format: 'binary' },
  })
  async downloadOccupancyExcel(
    @Res() res: Response,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('year1') year1?: number,
    @Query('year2') year2?: number,
  ) {
    // Validar que se proporcionen los parámetros correctos
    const isDateRange = startDate && endDate;
    const isYearComparison = year1 && year2;

    if (!isDateRange && !isYearComparison) {
      throw new Error('Debe proporcionar startDate/endDate o year1/year2');
    }

    if (isDateRange && isYearComparison) {
      throw new Error(
        'No puede proporcionar ambos: rango de fechas y años a comparar',
      );
    }

    // Llama al service para obtener el Excel y lo envía como archivo
    const workbook = isYearComparison
      ? await this.reportsService.getOccupancyCompareExcel({
          year1,
          year2,
        })
      : await this.reportsService.getOccupancyExcel({
          startDate,
          endDate,
        });

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );

    const filename = isYearComparison
      ? `occupancy_compare_${year1}_vs_${year2}.xlsx`
      : `occupancy_${startDate}_to_${endDate}.xlsx`;

    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    await workbook.xlsx.write(res);
    res.end();
  }
}
