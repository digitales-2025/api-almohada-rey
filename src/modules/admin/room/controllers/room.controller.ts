import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { RoomService } from '../services/room.service';

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
import { CreateRoomDto, UpdateRoomDto, DeleteRoomDto } from '../dto';
import { Room } from '../entities/room.entity';
import { BaseApiResponse } from 'src/utils/base-response/BaseApiResponse.dto';
import { Auth, GetUser } from '../../auth/decorators';

/**
 * Controlador REST para gestionar habitaciones.
 * Expone endpoints para operaciones CRUD sobre habitaciones.
 */
@ApiTags('Admin Rooms')
@ApiBadRequestResponse({
  description:
    'Bad Request - Error en la validación de datos o solicitud incorrecta',
})
@ApiUnauthorizedResponse({
  description: 'Unauthorized - No autorizado para realizar esta operación',
})
@Controller({ path: 'rooms', version: '1' })
@Auth()
export class RoomController {
  constructor(private readonly roomService: RoomService) {}

  /**
   * Crea una nueva habitación
   */
  @Post()
  @ApiOperation({ summary: 'Crear nueva habitación' })
  @ApiResponse({
    status: 201,
    description: 'Habitación creada exitosamente',
    type: BaseApiResponse,
  })
  @ApiBadRequestResponse({
    description: 'Datos de entrada inválidos o habitación ya existe',
  })
  create(
    @Body() createRoomDto: CreateRoomDto,
    @GetUser() user: UserData,
  ): Promise<BaseApiResponse<Room>> {
    return this.roomService.create(createRoomDto, user);
  }

  /**
   * Obtiene todas las habitaciones
   */
  @Get()
  @ApiOperation({ summary: 'Obtener todas las habitaciones' })
  @ApiResponse({
    status: 200,
    description: 'Lista de todas las habitaciones',
    type: [Room],
  })
  findAll(): Promise<Room[]> {
    return this.roomService.findAll();
  }

  /**
   * Obtiene una habitación por su ID
   */
  @Get(':id')
  @ApiOperation({ summary: 'Obtener habitación por ID' })
  @ApiParam({ name: 'id', description: 'ID de la habitación' })
  @ApiOkResponse({
    description: 'Habitación encontrada',
    type: Room,
  })
  @ApiNotFoundResponse({
    description: 'Habitación no encontrada',
  })
  findOne(@Param('id') id: string): Promise<Room> {
    return this.roomService.findOne(id);
  }

  /**
   * Obtiene una habitación por su número
   */
  @Get('number/:number')
  @ApiOperation({ summary: 'Obtener habitación por número' })
  @ApiParam({ name: 'number', description: 'Número de la habitación' })
  @ApiOkResponse({
    description: 'Habitación encontrada',
    type: Room,
  })
  @ApiNotFoundResponse({
    description: 'Habitación no encontrada',
  })
  findByNumber(@Param('number') number: string): Promise<Room> {
    return this.roomService.findByNumber(parseInt(number));
  }

  /**
   * Actualiza una habitación existente
   */
  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar habitación existente' })
  @ApiResponse({
    status: 200,
    description: 'Habitación actualizada exitosamente',
    type: BaseApiResponse,
  })
  update(
    @Param('id') id: string,
    @Body() updateRoomDto: UpdateRoomDto,
    @GetUser() user: UserData,
  ): Promise<BaseApiResponse<Room>> {
    return this.roomService.update(id, updateRoomDto, user);
  }

  /**
   * Desactiva múltiples habitaciones
   */
  @Delete('remove/all')
  @ApiOperation({ summary: 'Desactivar múltiples habitaciones' })
  @ApiResponse({
    status: 200,
    description: 'Habitaciones desactivadas exitosamente',
    type: BaseApiResponse,
  })
  @ApiBadRequestResponse({
    description: 'IDs inválidos o habitaciones no existen',
  })
  deleteMany(
    @Body() deleteRoomDto: DeleteRoomDto,
    @GetUser() user: UserData,
  ): Promise<BaseApiResponse<Room[]>> {
    return this.roomService.deleteMany(deleteRoomDto, user);
  }

  /**
   * Reactiva múltiples habitaciones
   */
  @Patch('reactivate/all')
  @ApiOperation({ summary: 'Reactivar múltiples habitaciones' })
  @ApiOkResponse({
    description: 'Habitaciones reactivadas exitosamente',
    type: BaseApiResponse,
  })
  @ApiBadRequestResponse({
    description: 'IDs inválidos o habitaciones no existen',
  })
  reactivateAll(
    @Body() deleteRoomDto: DeleteRoomDto,
    @GetUser() user: UserData,
  ): Promise<BaseApiResponse<Room[]>> {
    return this.roomService.reactivateMany(deleteRoomDto.ids, user);
  }
}
