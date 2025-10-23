import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { ImportService } from './import.service';
import { Auth } from '../auth/decorators';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { UserData } from 'src/interfaces';
import { ApiTags, ApiConsumes, ApiBody } from '@nestjs/swagger';

@ApiTags('Import Excel')
@Controller('import')
@Auth()
export class ImportController {
  constructor(private readonly importService: ImportService) {}

  @Post('excel')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Archivo Excel con datos de importación',
    type: 'multipart/form-data',
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Archivo Excel (.xlsx, .xls)',
        },
      },
      required: ['file'],
    },
  })
  async importExcel(
    @UploadedFile() file: Express.Multer.File,
    @GetUser() user: UserData,
  ) {
    return await this.importService.importExcelFile(file, user);
  }

  @Post('delete-by-excel')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description:
      'Archivo Excel con datos a eliminar (mismo formato que importación)',
    type: 'multipart/form-data',
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Archivo Excel con datos a eliminar (.xlsx, .xls)',
        },
      },
      required: ['file'],
    },
  })
  async deleteByExcel(
    @UploadedFile() file: Express.Multer.File,
    @GetUser() user: UserData,
  ) {
    return await this.importService.deleteDataByExcel(file, user);
  }

  @Post('analyze-import-status')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description:
      'Archivo Excel original de importación para analizar qué se importó y qué faltó',
    type: 'multipart/form-data',
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Archivo Excel original de importación (.xlsx, .xls)',
        },
      },
      required: ['file'],
    },
  })
  async analyzeImportStatus(
    @UploadedFile() file: Express.Multer.File,
    @GetUser() user: UserData,
    @Res() res: Response,
  ) {
    // Generar el Excel usando el servicio
    const workbook = await this.importService.generateImportAnalysisExcel(
      file,
      user,
    );

    // Configurar la respuesta como un archivo Excel para descarga
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=analisis_importacion_${new Date().toISOString().split('T')[0]}.xlsx`,
    );

    // Escribir el workbook directamente en la respuesta
    await workbook.xlsx.write(res);
    res.end();
  }

  // Temporarily commented out due to safety concerns - this endpoint deletes reservations and is very dangerous
  /*
  @Delete('cleanup')
  @ApiOperation({
    summary: 'Limpiar todos los datos importados',
    description:
      'Elimina todos los datos creados por la importación de Excel (reservas, pagos, clientes temporales, etc.)',
  })
  @ApiResponse({
    status: 200,
    description: 'Limpieza completada exitosamente',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        deletedCounts: {
          type: 'object',
          properties: {
            payments: { type: 'number' },
            reservations: { type: 'number' },
            customers: { type: 'number' },
            auditLogs: { type: 'number' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Error en la limpieza' })
  async cleanupImportedData(@GetUser() user: UserData) {
    return await this.importService.cleanupImportedData(user);
  }
    */
}
