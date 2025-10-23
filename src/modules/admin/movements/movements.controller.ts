import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { MovementsService } from './movements.service';
import { CreateMovementDto } from './dto/create-movement.dto';
import { UpdateMovementDto } from './dto/update-movement.dto';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import {
  HttpResponse,
  MovementsData,
  SummaryMovementsData,
  UserData,
} from 'src/interfaces';
import { Auth, GetUser } from '../auth/decorators';
import { PaginatedResponse } from 'src/utils/paginated-response/PaginatedResponse.dto';

@ApiTags('Admin Movements')
@ApiBadRequestResponse({ description: 'Bad Request' })
@ApiUnauthorizedResponse({ description: 'Unauthorized' })
@Auth()
@Controller({ path: 'movements', version: '1' })
export class MovementsController {
  constructor(private readonly movementsService: MovementsService) {}

  @ApiOperation({
    summary: 'Create a new movement',
    description: 'Create a new movement with the provided data',
  })
  @ApiCreatedResponse({
    description: 'Movement successfully created',
  })
  @Post()
  create(
    @Body() createMovementDto: CreateMovementDto,
    @GetUser() user: UserData,
  ): Promise<HttpResponse<MovementsData>> {
    return this.movementsService.create(createMovementDto, user);
  }

  @ApiOperation({
    summary: 'Get all movements',
    description: 'Get all movements with the provided data',
  })
  @ApiOkResponse({ description: 'Get all movements' })
  @Get()
  findAll(): Promise<SummaryMovementsData[]> {
    return this.movementsService.findAll();
  }

  @ApiOperation({
    summary: 'Get movement by id',
    description: 'Get movement by id with the provided data',
  })
  @ApiOkResponse({ description: 'Get movement by id' })
  @Get(':id')
  findOne(@Param('id') id: string): Promise<MovementsData> {
    return this.movementsService.findOne(id);
  }

  @Get('type/paginated')
  @ApiOperation({
    summary: 'Get paginated movements with advanced filters',
    description:
      'Get movements with advanced filtering by warehouse type, movement type, and flexible search in movements details, products, code, description, and document number (OR search)',
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
    description:
      'Search term for movements details, products, code, description, and document number (flexible OR search)',
    type: String,
    required: false,
  })
  @ApiQuery({
    name: 'warehouseType',
    description: 'Filter by warehouse type',
    enum: ['COMMERCIAL', 'INTERNAL_USE', 'DEPOSIT'],
    required: false,
  })
  @ApiQuery({
    name: 'type',
    description: 'Filter by movement type',
    enum: ['INPUT', 'OUTPUT'],
    required: false,
  })
  @ApiQuery({
    name: 'sortBy',
    description: 'Field to sort by',
    type: String,
    required: false,
  })
  @ApiQuery({
    name: 'sortOrder',
    description: 'Sort order',
    enum: ['asc', 'desc'],
    required: false,
  })
  @ApiOkResponse({
    description: 'Paginated list of movements with filters applied',
    schema: {
      title: 'MovementsPaginatedResponse',
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              codeUnique: { type: 'string' },
              dateMovement: { type: 'string', format: 'date-time' },
              type: { type: 'string', enum: ['INPUT', 'OUTPUT'] },
              description: { type: 'string' },
              warehouse: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  type: {
                    type: 'string',
                    enum: ['COMMERCIAL', 'INTERNAL_USE', 'DEPOSIT'],
                  },
                },
              },
              typePurchaseOrder: { type: 'string', nullable: true },
              documentNumber: { type: 'string', nullable: true },
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
    @Query('search') search?: string,
    @Query('warehouseType') warehouseType?: string,
    @Query('type') type?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
  ): Promise<PaginatedResponse<SummaryMovementsData>> {
    const pageNumber = parseInt(page, 10) || 1;
    const pageSizeNumber = parseInt(pageSize, 10) || 10;

    // Construir filtros
    const filterOptions: any = {};

    // Filtro por tipo de almacén
    if (warehouseType) {
      // Manejar múltiples valores separados por comas
      const warehouseTypes = warehouseType
        .split(',')
        .map((type) => type.trim());

      if (warehouseTypes.length === 1) {
        // Un solo tipo
        filterOptions.searchByFieldsRelational = [
          {
            warehouse: {
              type: warehouseTypes[0],
            },
          },
        ];
      } else {
        // Múltiples tipos - usar OR directamente
        filterOptions.OR = warehouseTypes.map((type) => ({
          warehouse: {
            type: type,
          },
        }));
      }
    }

    // Filtro por tipo de movimiento
    if (type) {
      filterOptions.searchByField = {
        ...filterOptions.searchByField,
        type: type,
      };
    }

    // Búsqueda en relaciones (movementsDetail y product)
    if (search) {
      // Usar OR a nivel superior para manejar búsquedas en múltiples campos
      filterOptions.OR = [
        // Búsqueda en productos del movementsDetail
        {
          movementsDetail: {
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
        // Búsqueda por código único del movimiento
        {
          codeUnique: {
            contains: search,
            mode: 'insensitive',
          },
        },
        // Búsqueda por descripción del movimiento
        {
          description: {
            contains: search,
            mode: 'insensitive',
          },
        },
        // Búsqueda por número de documento (si existe)
        {
          documentNumber: {
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
      sortOptions.order = sortOrder || 'desc';
    }

    return this.movementsService.findAllPaginated(
      { page: pageNumber, pageSize: pageSizeNumber },
      filterOptions,
      sortOptions,
    );
  }

  @ApiOperation({
    summary: 'Update movement by id',
    description: 'Update movement by id with the provided data',
  })
  @ApiOkResponse({ description: 'Movement successfully updated' })
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateMovementDto: UpdateMovementDto,
    @GetUser() user: UserData,
  ) {
    return this.movementsService.update(id, updateMovementDto, user);
  }

  @ApiOperation({
    summary: 'Delete movement by id',
    description: 'Delete movement by id with the provided data',
  })
  @ApiOkResponse({ description: 'Movement successfully deleted' })
  @Delete(':id')
  remove(
    @Param('id') id: string,
    @GetUser() user: UserData,
  ): Promise<HttpResponse<MovementsData>> {
    return this.movementsService.remove(id, user);
  }
}
