import { Controller, Get, Param, Query } from '@nestjs/common';
import { WarehouseService } from './warehouse.service';
import { PaginatedResponse } from 'src/utils/paginated-response/PaginatedResponse.dto';
import { StockData, SummaryWarehouseData, WarehouseData } from 'src/interfaces';
import {
  ApiBadRequestResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Auth } from '../auth/decorators';
import { ProductType } from '@prisma/client';

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
  @ApiOperation({ summary: 'Get paginated warehouses' })
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
              type: { type: 'string', enum: ['CENTRAL', 'LOCAL'] },
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
    @Query('page') page: string = '1',
    @Query('pageSize') pageSize: string = '10',
  ): Promise<PaginatedResponse<SummaryWarehouseData>> {
    const pageNumber = parseInt(page, 10) || 1;
    const pageSizeNumber = parseInt(pageSize, 10) || 10;

    return this.warehouseService.findAllPaginated({
      page: pageNumber,
      pageSize: pageSizeNumber,
    });
  }

  @ApiOperation({ summary: 'Get warehouse by id' })
  @ApiQuery({
    name: 'movementId',
    description: 'Movement ID to filter the warehouse data',
    type: String,
    required: false,
  })
  @ApiQuery({
    name: 'id',
    description: 'Warehouse ID',
    type: String,
    required: true,
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
    enum: ProductType,
    enumName: 'ProductType',
    description: 'Tipo de almacén (COMMERCIAL o INTERNAL_USE)',
  })
  @ApiOkResponse({ description: 'Get warehouse by type' })
  @Get('all/type/:type')
  findAllByType(
    @Param('type') type: ProductType,
  ): Promise<SummaryWarehouseData> {
    return this.warehouseService.findWarehouseByType(type);
  }

  @ApiOperation({ summary: 'Get stock of products by warehouse type' })
  @ApiParam({
    name: 'type',
    enum: ProductType,
    enumName: 'ProductType',
    description: 'Tipo de almacén (COMMERCIAL o INTERNAL_USE)',
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
    @Param('type') type: ProductType,
    @Query('paymentDetailId') paymentDetailId?: string,
  ): Promise<StockData[]> {
    return this.warehouseService.findProductsStockByType(type, paymentDetailId);
  }
}
