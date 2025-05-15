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
   * Descarga un Excel con el profit (ganancia) del mes y año indicados.
   * @param month Mes numérico (1-12)
   * @param year Año (YYYY)
   * @param res Respuesta HTTP para enviar el archivo
   */
  @Get('profit')
  @ApiOperation({
    summary: 'Descargar Excel de profit mensual',
    description:
      'Genera y descarga un archivo Excel con el profit para un mes y año específicos.',
  })
  @ApiQuery({
    name: 'month',
    description: 'Mes numérico (1-12)',
    type: Number,
    example: 5,
    required: true,
  })
  @ApiQuery({
    name: 'year',
    description: 'Año en formato YYYY',
    type: Number,
    example: 2024,
    required: true,
  })
  @ApiOkResponse({
    description: 'Archivo Excel con el profit mensual',
    schema: { type: 'string', format: 'binary' },
  })
  async downloadProfitExcel(
    @Query('month') month: number,
    @Query('year') year: number,
    @Res() res: Response,
  ) {
    // Llama al service para obtener el Excel y lo envía como archivo
    const workbook = await this.reportsService.getProfitExcel({ month, year });
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=profit_${year}_${month}.xlsx`,
    );
    await workbook.xlsx.write(res);
    res.end();
  }

  /**
   * Descarga un Excel con el expense (gasto) del mes y año indicados.
   * @param month Mes numérico (1-12)
   * @param year Año (YYYY)
   * @param res Respuesta HTTP para enviar el archivo
   */
  @Get('expense')
  @ApiOperation({
    summary: 'Descargar Excel de expense mensual',
    description:
      'Genera y descarga un archivo Excel con el expense para un mes y año específicos.',
  })
  @ApiQuery({
    name: 'month',
    description: 'Mes numérico (1-12)',
    type: Number,
    example: 5,
    required: true,
  })
  @ApiQuery({
    name: 'year',
    description: 'Año en formato YYYY',
    type: Number,
    example: 2024,
    required: true,
  })
  @ApiOkResponse({
    description: 'Archivo Excel con el expense mensual',
    schema: { type: 'string', format: 'binary' },
  })
  async downloadExpenseExcel(
    @Query('month') month: number,
    @Query('year') year: number,
    @Res() res: Response,
  ) {
    // Llama al service para obtener el Excel y lo envía como archivo
    const workbook = await this.reportsService.getExpenseExcel({ month, year });
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=expense_${year}_${month}.xlsx`,
    );
    await workbook.xlsx.write(res);
    res.end();
  }

  /**
   * Descarga un Excel con el balance (profit - expense) del mes y año indicados.
   * @param month Mes numérico (1-12)
   * @param year Año (YYYY)
   * @param res Respuesta HTTP para enviar el archivo
   */
  @Get('balance')
  @ApiOperation({
    summary: 'Descargar Excel de balance mensual',
    description:
      'Genera y descarga un archivo Excel con el balance para un mes y año específicos.',
  })
  @ApiQuery({
    name: 'month',
    description: 'Mes numérico (1-12)',
    type: Number,
    example: 5,
    required: true,
  })
  @ApiQuery({
    name: 'year',
    description: 'Año en formato YYYY',
    type: Number,
    example: 2024,
    required: true,
  })
  @ApiOkResponse({
    description: 'Archivo Excel con el balance mensual',
    schema: { type: 'string', format: 'binary' },
  })
  async downloadBalanceExcel(
    @Query('month') month: number,
    @Query('year') year: number,
    @Res() res: Response,
  ) {
    // Llama al service para obtener el Excel y lo envía como archivo
    const workbook = await this.reportsService.getBalanceExcel({ month, year });
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=balance_${year}_${month}.xlsx`,
    );
    await workbook.xlsx.write(res);
    res.end();
  }

  //reportes por tipo de habitación
  @Get('profitRoomType')
  @ApiOperation({
    summary: 'Descargar Excel de ganancias por tipo de habitación',
    description:
      'Genera y descarga un archivo Excel con el profit para un mes, año y tipo de habitación específicos.',
  })
  @ApiQuery({
    name: 'month',
    description: 'Mes numérico (1-12)',
    type: Number,
    example: 5,
    required: true,
  })
  @ApiQuery({
    name: 'year',
    description: 'Año en formato YYYY',
    type: Number,
    example: 2024,
    required: true,
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
    @Query('month') month: number,
    @Query('year') year: number,
    @Query('typeRoomId') typeRoomId: string,
    @Res() res: Response,
  ) {
    const workbook = await this.reportsService.getProfitTypeRoomExcel({
      month,
      year,
      typeRoomId,
    });
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=profit_roomtype_${year}_${month}.xlsx`,
    );
    await workbook.xlsx.write(res);
    res.end();
  }
  /**
   * Descarga un Excel con estadísticas de ocupación por tipo de habitación del mes y año indicados.
   * @param month Mes numérico (1-12)
   * @param year Año (YYYY)
   * @param res Respuesta HTTP para enviar el archivo
   */
  @Get('occupancy')
  @ApiOperation({
    summary: 'Descargar Excel de estadísticas de ocupación',
    description:
      'Genera y descarga un archivo Excel con estadísticas de ocupación por tipo de habitación para un mes y año específicos.',
  })
  @ApiQuery({
    name: 'month',
    description: 'Mes numérico (1-12)',
    type: Number,
    example: 5,
    required: true,
  })
  @ApiQuery({
    name: 'year',
    description: 'Año en formato YYYY',
    type: Number,
    example: 2024,
    required: true,
  })
  @ApiOkResponse({
    description: 'Archivo Excel con estadísticas de ocupación',
    schema: { type: 'string', format: 'binary' },
  })
  async downloadOccupancyExcel(
    @Query('month') month: number,
    @Query('year') year: number,
    @Res() res: Response,
  ) {
    // Llama al service para obtener el Excel y lo envía como archivo
    const workbook = await this.reportsService.getOccupancyExcel({
      month,
      year,
    });
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=occupancy_${year}_${month}.xlsx`,
    );
    await workbook.xlsx.write(res);
    res.end();
  }
}
