import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { CleaningChecklistService } from '../services/room-clean.service';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiParam,
  ApiOkResponse,
  ApiNotFoundResponse,
} from '@nestjs/swagger';
import { UserData } from 'src/interfaces';
import {
  CreateCleaningChecklistDto,
  UpdateCleaningChecklistDto,
  DeleteCleaningChecklistDto,
} from '../dto';
import { CleaningChecklist } from '../entities/room-clean.entity';
import { BaseApiResponse } from 'src/utils/base-response/BaseApiResponse.dto';
import { Auth, GetUser } from '../../auth/decorators';

/**
 * Controlador REST para gestionar registros de limpieza de habitaciones.
 * Expone endpoints para operaciones CRUD sobre registros de limpieza.
 */
@ApiTags('Room Cleaning')
@ApiBadRequestResponse({
  description:
    'Bad Request - Error en la validación de datos o solicitud incorrecta',
})
@ApiUnauthorizedResponse({
  description: 'Unauthorized - No autorizado para realizar esta operación',
})
@Controller({ path: 'room-cleaning', version: '1' })
@Auth()
export class CleaningChecklistController {
  constructor(private readonly cleaningService: CleaningChecklistService) {}

  /**
   * Crea un nuevo registro de limpieza
   */
  @Post()
  @ApiOperation({ summary: 'Crear nuevo registro de limpieza' })
  @ApiResponse({
    status: 201,
    description: 'Registro de limpieza creado exitosamente',
    type: BaseApiResponse,
  })
  @ApiBadRequestResponse({
    description: 'Datos de entrada inválidos o registro duplicado',
  })
  create(
    @Body() createCleaningDto: CreateCleaningChecklistDto,
    @GetUser() user: UserData,
  ): Promise<BaseApiResponse<CleaningChecklist>> {
    return this.cleaningService.create(createCleaningDto, user);
  }

  /**
   * Obtiene todos los registros de limpieza
   */
  @Get()
  @ApiOperation({ summary: 'Obtener todos los registros de limpieza' })
  @ApiResponse({
    status: 200,
    description: 'Lista de todos los registros de limpieza',
    type: [CleaningChecklist],
  })
  findAll(): Promise<CleaningChecklist[]> {
    return this.cleaningService.findAll();
  }

  /**
   * Obtiene un registro de limpieza por su ID
   */
  @Get(':id')
  @ApiOperation({ summary: 'Obtener registro de limpieza por ID' })
  @ApiParam({ name: 'id', description: 'ID del registro de limpieza' })
  @ApiOkResponse({
    description: 'Registro de limpieza encontrado',
    type: CleaningChecklist,
  })
  @ApiNotFoundResponse({
    description: 'Registro de limpieza no encontrado',
  })
  findOne(@Param('id') id: string): Promise<CleaningChecklist> {
    return this.cleaningService.findOne(id);
  }

  /**
   * Obtiene registros de limpieza por habitación
   */
  @Get('room/:roomId')
  @ApiOperation({ summary: 'Obtener registros de limpieza por habitación' })
  @ApiParam({ name: 'roomId', description: 'ID de la habitación' })
  @ApiOkResponse({
    description: 'Registros de limpieza encontrados',
    type: [CleaningChecklist],
  })
  findByRoom(@Param('roomId') roomId: string): Promise<CleaningChecklist[]> {
    return this.cleaningService.findByRoom(roomId);
  }

  /**
   * Obtiene registros de limpieza por fecha
   */
  @Get('date/:date')
  @ApiOperation({ summary: 'Obtener registros de limpieza por fecha' })
  @ApiParam({ name: 'date', description: 'Fecha (YYYY-MM-DD)' })
  @ApiOkResponse({
    description: 'Registros de limpieza encontrados',
    type: [CleaningChecklist],
  })
  findByDate(@Param('date') date: string): Promise<CleaningChecklist[]> {
    return this.cleaningService.findByDate(date);
  }

  /**
   * Actualiza un registro de limpieza existente
   */
  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar registro de limpieza existente' })
  @ApiResponse({
    status: 200,
    description: 'Registro de limpieza actualizado exitosamente',
    type: BaseApiResponse,
  })
  update(
    @Param('id') id: string,
    @Body() updateCleaningDto: UpdateCleaningChecklistDto,
    @GetUser() user: UserData,
  ): Promise<BaseApiResponse<CleaningChecklist>> {
    return this.cleaningService.update(id, updateCleaningDto, user);
  }

  /**
   * Desactiva múltiples registros de limpieza
   */
  @Delete('remove/all')
  @ApiOperation({ summary: 'Desactivar múltiples registros de limpieza' })
  @ApiResponse({
    status: 200,
    description: 'Registros de limpieza desactivados exitosamente',
    type: BaseApiResponse,
  })
  @ApiBadRequestResponse({
    description: 'IDs inválidos o registros no existen',
  })
  deleteMany(
    @Body() deleteCleaningDto: DeleteCleaningChecklistDto,
    @GetUser() user: UserData,
  ): Promise<BaseApiResponse<CleaningChecklist[]>> {
    return this.cleaningService.deleteMany(deleteCleaningDto, user);
  }

  /**
   * Reactiva múltiples registros de limpieza
   */
  @Patch('reactivate/all')
  @ApiOperation({ summary: 'Reactivar múltiples registros de limpieza' })
  @ApiOkResponse({
    description: 'Registros de limpieza reactivados exitosamente',
    type: BaseApiResponse,
  })
  @ApiBadRequestResponse({
    description: 'IDs inválidos o registros no existen',
  })
  reactivateAll(
    @Body() deleteCleaningDto: DeleteCleaningChecklistDto,
    @GetUser() user: UserData,
  ): Promise<BaseApiResponse<CleaningChecklist[]>> {
    return this.cleaningService.reactivateMany(deleteCleaningDto.ids, user);
  }
}
