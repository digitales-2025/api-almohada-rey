import { Controller, Get, Param, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { WarehouseService } from './warehouse.service';
import { PaginatedResponse } from 'src/utils/paginated-response/PaginatedResponse.dto';
import {
  StockData,
  SummaryWarehouseData,
  WarehouseData,
  UserPayload,
} from 'src/interfaces';
import {
  ApiBadRequestResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Auth, GetUser } from '../auth/decorators';
import { WarehouseType } from '@prisma/client';

@ApiTags('Admin Warehouse')
@ApiBadRequestResponse({ description: 'Bad Request' })
@ApiUnauthorizedResponse({ description: 'Unauthorized' })
@Auth()
@Controller({ path: 'warehouse', version: '1' })
export class WarehouseController {
  constructor(private readonly warehouseService: WarehouseService) {}

  @ApiOperation({ summary: 'Get all warehouses' })
  @ApiOkResponse({ description: 'Get all warehouse' })
  @Get()
  findAll(): Promise<SummaryWarehouseData[]> {
    return this.warehouseService.findAll();
  }

  @Get('paginated')
  @ApiOperation({
    summary: 'Get paginated warehouses with advanced filters',
    description:
      'Get warehouses with advanced filtering by type and search in stock products. Only super admin can see DEPOSIT warehouses.',
  })
  @ApiQuery({
    name: 'page',
    description: 'Page number',
    type: Number,
    example: 1,
    required: false,
  })
  @ApiQuery({
    name: 'pageSize',
    description: 'Number of items per page',
    type: Number,
    example: 10,
    required: false,
  })
  @ApiQuery({
    name: 'search',
    description: 'Search term for stock products (name, code)',
    type: String,
    required: false,
  })
  @ApiQuery({
    name: 'type',
    description: 'Filter by warehouse type (array)',
    type: String,
    example: 'COMMERCIAL,INTERNAL_USE,DEPOSIT',
    required: false,
  })
  @ApiQuery({
    name: 'sortBy',
    description: 'Field to sort by',
    type: String,
    example: 'type',
    required: false,
  })
  @ApiQuery({
    name: 'sortOrder',
    description: 'Sort order',
    type: String,
    enum: ['asc', 'desc'],
    example: 'asc',
    required: false,
  })
  @ApiOkResponse({
    description: 'Paginated list of warehouses',
    schema: {
      title: 'WarehousesPaginatedResponse',
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              type: {
                type: 'string',
                enum: ['COMMERCIAL', 'INTERNAL_USE', 'DEPOSIT'],
              },
              code: { type: 'string' },
              quantityProducts: { type: 'number' },
              totalCost: { type: 'number' },
            },
          },
        },
        meta: {
          type: 'object',
          properties: {
            total: { type: 'number' },
            page: { type: 'number' },
            pageSize: { type: 'number' },
            totalPages: { type: 'number' },
            hasNext: { type: 'boolean' },
            hasPrevious: { type: 'boolean' },
          },
        },
      },
    },
  })
  findAllPaginated(
    @GetUser() user: UserPayload,
    @Query('page') page: string = '1',
    @Query('pageSize') pageSize: string = '10',
    @Query('search') search?: string,
    @Query('type') type?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
  ): Promise<PaginatedResponse<SummaryWarehouseData>> {
    const pageNumber = parseInt(page, 10) || 1;
    const pageSizeNumber = parseInt(pageSize, 10) || 10;

    // Construir filtros
    const filterOptions: any = {};

    // Filtro por tipo (array)
    if (type) {
      const typeArray = type.split(',').map((t) => t.trim());
      filterOptions.arrayByField = {
        ...filterOptions.arrayByField,
        type: typeArray,
      };
    }

    // Búsqueda en productos del stock
    if (search) {
      // Usar OR a nivel superior para manejar warehouses con y sin stock
      filterOptions.OR = [
        // Búsqueda en productos del stock (warehouses que tienen stock)
        {
          stock: {
            some: {
              product: {
                OR: [
                  {
                    name: {
                      contains: search,
                      mode: 'insensitive',
                    },
                  },
                  {
                    code: {
                      contains: search,
                      mode: 'insensitive',
                    },
                  },
                ],
              },
            },
          },
        },
        // Buscar por código del warehouse - usar contains para búsquedas flexibles
        {
          code: {
            contains: search,
            mode: 'insensitive',
          },
        },
      ];
    }

    // Construir opciones de ordenamiento
    const sortOptions: any = {};
    if (sortBy) {
      sortOptions.field = sortBy;
      sortOptions.order = sortOrder || 'asc';
    }

    return this.warehouseService.findAllPaginated(
      { page: pageNumber, pageSize: pageSizeNumber },
      filterOptions,
      sortOptions,
      { isSuperAdmin: user.isSuperAdmin },
    );
  }

  @ApiOperation({ summary: 'Get warehouse by id' })
  @ApiParam({
    name: 'id',
    description: 'Warehouse ID',
    type: String,
    required: true,
  })
  @ApiQuery({
    name: 'movementId',
    description: 'Movement ID to filter the warehouse data',
    type: String,
    required: false,
  })
  @ApiOkResponse({ description: 'Get warehouse by id' })
  @Get(':id')
  findOne(
    @Param('id') id: string,
    @Query('movementId') movementId?: string,
  ): Promise<WarehouseData> {
    return this.warehouseService.findOne(id, movementId);
  }

  @ApiOperation({ summary: 'Get warehouse by type' })
  @ApiParam({
    name: 'type',
    enum: WarehouseType,
    enumName: 'WarehouseType',
    description: 'Tipo de almacén (COMMERCIAL,INTERNAL_USE o DEPOSIT)',
  })
  @ApiOkResponse({ description: 'Get warehouse by type' })
  @Get('all/type/:type')
  findAllByType(
    @Param('type') type: WarehouseType,
  ): Promise<SummaryWarehouseData> {
    return this.warehouseService.findWarehouseByType(type);
  }

  @ApiOperation({ summary: 'Get stock of products by warehouse type' })
  @ApiParam({
    name: 'type',
    enum: WarehouseType,
    enumName: 'WarehouseType',
    description: 'Tipo de almacén (COMMERCIAL, INTERNAL_USE o DEPOSIT)',
  })
  @ApiQuery({
    name: 'paymentDetailId',
    description: 'Payment detail ID to filter the stock data',
    type: String,
    required: false,
  })
  @ApiOkResponse({ description: 'Get stock of products by warehouse type' })
  @Get('stock/product/:type')
  findProductsStockByType(
    @Param('type') type: WarehouseType,
    @Query('paymentDetailId') paymentDetailId?: string,
  ): Promise<StockData[]> {
    return this.warehouseService.findProductsStockByType(type, paymentDetailId);
  }

  @Get(':id/excel')
  @ApiOperation({
    summary: 'Descargar Excel de stock del almacén',
    description:
      'Genera y descarga un archivo Excel con el inventario actual del almacén.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID del almacén',
    type: String,
    required: true,
  })
  @ApiOkResponse({
    description: 'Archivo Excel con el inventario del almacén',
    schema: { type: 'string', format: 'binary' },
  })
  async downloadWarehouseStockExcel(
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    // Llama al service para obtener el Excel
    const workbook = await this.warehouseService.getWarehouseStockExcel(id);

    // Obtiene los datos del almacén para incluir el código en el nombre del archivo
    const warehouse = await this.warehouseService.findOne(id);

    // Configura la respuesta como un archivo Excel para descarga
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=stock_almacen_${warehouse.code}_${new Date().toISOString().split('T')[0]}.xlsx`,
    );

    // Escribe el workbook directamente en la respuesta
    await workbook.xlsx.write(res);
    res.end();
  }
}
