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
import { TypeMovements } from '@prisma/client';
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
  @ApiOperation({ summary: 'Get paginated movements by type' })
  @ApiQuery({
    name: 'type',
    required: true,
    enum: TypeMovements,
    description: 'Type of movement (INPUT or OUTPUT)',
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
  @ApiOkResponse({
    description: 'Paginated list of movements by type',
    schema: {
      title: 'MovementsByTypePaginatedResponse',
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
                  type: { type: 'string', enum: ['CENTRAL', 'LOCAL'] },
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
  findByTypePaginated(
    @Query('type') type: TypeMovements,
    @Query('page') page: string = '1',
    @Query('pageSize') pageSize: string = '10',
  ): Promise<PaginatedResponse<SummaryMovementsData>> {
    const pageNumber = parseInt(page, 10) || 1;
    const pageSizeNumber = parseInt(pageSize, 10) || 10;

    return this.movementsService.findByType(type, {
      page: pageNumber,
      pageSize: pageSizeNumber,
    });
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
