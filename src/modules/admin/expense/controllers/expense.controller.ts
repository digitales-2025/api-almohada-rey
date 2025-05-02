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
import { ExpenseService } from '../services/expense.service';

import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiParam,
  ApiOkResponse,
  ApiNotFoundResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { UserData } from 'src/interfaces';
import {
  CreateHotelExpenseDto,
  UpdateHotelExpenseDto,
  DeleteHotelExpenseDto,
} from '../dto';
import { HotelExpenseEntity } from '../entities/expense.entity';
import { BaseApiResponse } from 'src/utils/base-response/BaseApiResponse.dto';
import { Auth, GetUser } from '../../auth/decorators';

/**
 * Controlador REST para gestionar gastos del hotel.
 * Expone endpoints para operaciones CRUD sobre gastos.
 */
@ApiTags('Admin Expenses')
@ApiBadRequestResponse({
  description:
    'Bad Request - Error en la validación de datos o solicitud incorrecta',
})
@ApiUnauthorizedResponse({
  description: 'Unauthorized - No autorizado para realizar esta operación',
})
@Controller({ path: 'expenses', version: '1' })
@Auth()
export class ExpenseController {
  constructor(private readonly expenseService: ExpenseService) {}

  /**
   * Crea un nuevo gasto
   */
  @Post()
  @ApiOperation({ summary: 'Crear nuevo gasto' })
  @ApiResponse({
    status: 201,
    description: 'Gasto creado exitosamente',
    type: BaseApiResponse,
  })
  @ApiBadRequestResponse({
    description: 'Datos de entrada inválidos',
  })
  create(
    @Body() createHotelExpenseDto: CreateHotelExpenseDto,
    @GetUser() user: UserData,
  ): Promise<BaseApiResponse<HotelExpenseEntity>> {
    return this.expenseService.create(createHotelExpenseDto, user);
  }

  /**
   * Obtiene todos los gastos
   */
  @Get()
  @ApiOperation({ summary: 'Obtener todos los gastos' })
  @ApiResponse({
    status: 200,
    description: 'Lista de todos los gastos',
    type: [HotelExpenseEntity],
  })
  findAll(): Promise<HotelExpenseEntity[]> {
    return this.expenseService.findAll();
  }

  /**
   * Obtiene un gasto por su ID
   */
  @Get(':id')
  @ApiOperation({ summary: 'Obtener gasto por ID' })
  @ApiParam({ name: 'id', description: 'ID del gasto' })
  @ApiOkResponse({
    description: 'Gasto encontrado',
    type: HotelExpenseEntity,
  })
  @ApiNotFoundResponse({
    description: 'Gasto no encontrado',
  })
  findOne(@Param('id') id: string): Promise<HotelExpenseEntity> {
    return this.expenseService.findOne(id);
  }

  /**
   * Obtiene gastos por fecha
   */
  @Get('filter/date')
  @ApiOperation({ summary: 'Obtener gastos por fecha' })
  @ApiQuery({
    name: 'date',
    required: true,
    description: 'Fecha del gasto (formato YYYY-MM-DD)',
  })
  @ApiOkResponse({
    description: 'Gastos encontrados para la fecha especificada',
    type: [HotelExpenseEntity],
  })
  findByDate(@Query('date') date: string): Promise<HotelExpenseEntity[]> {
    return this.expenseService.findByDate(date);
  }

  /**
   * Actualiza un gasto existente
   */
  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar gasto existente' })
  @ApiParam({ name: 'id', description: 'ID del gasto' })
  @ApiResponse({
    status: 200,
    description: 'Gasto actualizado exitosamente',
    type: BaseApiResponse,
  })
  update(
    @Param('id') id: string,
    @Body() updateHotelExpenseDto: UpdateHotelExpenseDto,
    @GetUser() user: UserData,
  ): Promise<BaseApiResponse<HotelExpenseEntity>> {
    return this.expenseService.update(id, updateHotelExpenseDto, user);
  }

  /**
   * Elimina múltiples gastos
   */
  @Delete('remove/all')
  @ApiOperation({ summary: 'Eliminar múltiples gastos' })
  @ApiResponse({
    status: 200,
    description: 'Gastos eliminados exitosamente',
    type: BaseApiResponse,
  })
  @ApiBadRequestResponse({
    description: 'IDs inválidos o gastos no existen',
  })
  deleteMany(
    @Body() deleteHotelExpenseDto: DeleteHotelExpenseDto,
    @GetUser() user: UserData,
  ): Promise<BaseApiResponse<HotelExpenseEntity[]>> {
    return this.expenseService.deleteMany(deleteHotelExpenseDto, user);
  }
}
