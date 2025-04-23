import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UploadedFile,
  BadRequestException,
  UseInterceptors,
  Res,
  ParseFilePipeBuilder,
  HttpStatus,
} from '@nestjs/common';
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { Auth, GetUser } from 'src/modules/admin/auth/decorators';
import { Response } from 'express';
import { Header } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConsumes,
  ApiCreatedResponse,
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import {
  CustomerData,
  HttpResponse,
  UserData,
  UserPayload,
} from 'src/interfaces';
import { DeleteCustomerDto } from './dto/delete-customer.dto';
import { Customer } from './entity/customer.entity';
import { HistoryCustomerData } from 'src/interfaces/customer.interface';
import { ReservationStatus } from '@prisma/client';
import { ImportCustomersDto } from './dto/import-customers.dto';
import { FileInterceptor } from '@nestjs/platform-express';

@ApiTags('Admin Customers')
@ApiUnauthorizedResponse({ description: 'Unauthorized' })
@ApiInternalServerErrorResponse({ description: 'Internal server error' })
@ApiBadRequestResponse({ description: 'Bad request' })
@Controller({
  path: 'customers',
  version: '1',
})
@Auth()
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @ApiCreatedResponse({ description: 'Customer created successfully' })
  @ApiOperation({ summary: 'Create a new customer' })
  @Post()
  create(
    @Body() createCustomerDto: CreateCustomerDto,
    @GetUser() user: UserData,
  ): Promise<HttpResponse<CustomerData>> {
    return this.customersService.create(createCustomerDto, user);
  }

  @Post('import')
  @UseInterceptors(
    FileInterceptor('file', {
      fileFilter: (req, file, callback) => {
        // Verificar que el archivo sea un Excel (.xlsx)
        if (!file.originalname.match(/\.(xlsx)$/)) {
          return callback(
            new BadRequestException('Solo se permiten archivos Excel (.xlsx)'),
            false,
          );
        }
        callback(null, true);
      },
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB máximo
      },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Importar clientes desde un archivo Excel' })
  @ApiResponse({
    status: 200,
    description: 'Clientes importados correctamente',
  })
  @ApiBadRequestResponse({
    description: 'Formato de archivo inválido o datos incorrectos',
  })
  importCustomers(
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({
          fileType:
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        })
        .addMaxSizeValidator({
          maxSize: 5 * 1024 * 1024, // 5MB
        })
        .build({
          errorHttpStatusCode: HttpStatus.BAD_REQUEST,
        }),
    )
    file: Express.Multer.File,
    @Body() importCustomersDto: ImportCustomersDto,
    @GetUser() user: UserData,
  ) {
    if (!file) {
      throw new BadRequestException('No se ha proporcionado ningún archivo');
    }

    return this.customersService.importFromExcel(
      file,
      importCustomersDto.continueOnError || true,
      user,
    );
  }

  @Get('import/template')
  @ApiOperation({ summary: 'Download template to import client excel' })
  @ApiResponse({
    status: 200,
    description: 'Plantilla Excel para importar clientes',
  })
  @Header(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  )
  @Header('Content-Disposition', 'attachment; filename=plantilla_clientes.xlsx')
  async downloadTemplate(@Res() res: Response) {
    const workbook = await this.customersService.generateCustomerTemplate();

    // Configurar el response
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=plantilla_clientes.xlsx',
    );

    // Enviar el archivo
    await workbook.xlsx.write(res);
    res.end();
  }

  @ApiOkResponse({ description: 'Customers found successfully' })
  @ApiOperation({ summary: 'Get all customers' })
  @Get()
  findAll(@GetUser() user: UserPayload): Promise<CustomerData[]> {
    return this.customersService.findAll(user);
  }

  @Get('searchByDocNumber')
  @ApiOkResponse({
    description: 'Customers found successfully',
    type: [Customer],
  })
  @ApiOperation({
    summary:
      'Busqueda rápida de cliente por su número de documento de identidad, siempre se tiene que enviar un string o "None" al query param docNumber',
  })
  searchByDocNumber(
    @Query('docNumber') docNumber: string,
  ): Promise<Customer[]> {
    return this.customersService.searchCustomerByDocumentIdCoincidence(
      docNumber,
    );
  }

  @ApiOkResponse({ description: 'Customer found successfully' })
  @ApiOperation({ summary: 'Get a customer by id' })
  @Get(':id')
  findOne(@Param('id') id: string): Promise<CustomerData> {
    return this.customersService.findOne(id);
  }

  @ApiOkResponse({ description: 'History Customer found successfully' })
  @ApiOperation({
    summary: 'Get a history customer by id with optional filters',
  })
  @ApiQuery({
    name: 'year',
    required: false,
    type: Number,
    description: 'Filter reservations by year',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ReservationStatus,
    description: 'Filter reservations by status',
  })
  @Get('history/booking/:id')
  findCustomerHistoryById(
    @Param('id') id: string,
    @Query('year') year?: number,
    @Query('status') reservationStatus?: ReservationStatus,
  ): Promise<HistoryCustomerData> {
    return this.customersService.findCustomerHistoryById(
      id,
      year,
      reservationStatus,
    );
  }

  @ApiOkResponse({ description: 'Customer found successfully' })
  @ApiOperation({ summary: 'Get a customer by document number' })
  @Get('document/number/:documentNumber')
  findDocumentNumber(@Param('documentNumber') documentNumber: string) {
    return this.customersService.findDocumentNumber(documentNumber);
  }

  @ApiOkResponse({ description: 'Customer updated successfully' })
  @ApiOperation({ summary: 'Update a customer by id' })
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateCustomerDto: UpdateCustomerDto,
    @GetUser() user: UserData,
  ): Promise<HttpResponse<CustomerData>> {
    return this.customersService.update(id, updateCustomerDto, user);
  }

  @ApiOkResponse({ description: 'Customers deactivated successfully' })
  @ApiOperation({ summary: 'Deactivate a customer by id' })
  @Delete('remove/all')
  deactivate(
    @Body() customers: DeleteCustomerDto,
    @GetUser() user: UserData,
  ): Promise<Omit<HttpResponse, 'data'>> {
    return this.customersService.removeAll(customers, user);
  }

  @ApiOkResponse({ description: 'Customers reactivated successfully' })
  @ApiOperation({ summary: 'Reactivate a customer by id' })
  @Patch('reactivate/all')
  reactivateAll(
    @GetUser() user: UserData,
    @Body() customers: DeleteCustomerDto,
  ): Promise<Omit<HttpResponse, 'data'>> {
    return this.customersService.reactivateAll(user, customers);
  }
}
