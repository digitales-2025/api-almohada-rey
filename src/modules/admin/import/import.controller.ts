import {
  Controller,
  Post,
  Delete,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ImportService } from './import.service';
import { Auth } from '../auth/decorators';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { UserData } from 'src/interfaces';
import {
  ApiTags,
  ApiConsumes,
  ApiBody,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';

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
}
