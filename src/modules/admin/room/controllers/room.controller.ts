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
  ApiQuery,
} from '@nestjs/swagger';
import { UserData, UserPayload } from 'src/interfaces';
import { CreateRoomDto, UpdateRoomDto, DeleteRoomDto } from '../dto';
import { FindAllRoom, Room } from '../entities/room.entity';
import { BaseApiResponse } from 'src/utils/base-response/BaseApiResponse.dto';
import { Auth, GetUser } from '../../auth/decorators';
import { StatusRoomDto } from '../dto/status.dto';
import { PaginatedResponse } from 'src/utils/paginated-response/PaginatedResponse.dto';
import { UpdateAmenitiesRoomDto } from '../dto/update-amenities-room.dto';

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
  findAll(@GetUser() user: UserPayload): Promise<FindAllRoom[]> {
    return this.roomService.findAll(user);
  }

  /**
   * Obtiene habitaciones paginadas
   */
  @Get('paginated')
  @ApiOperation({
    summary: 'Obtener habitaciones paginadas con información detallada',
    description:
      'Devuelve una lista paginada de habitaciones con sus tipos e imagen principal',
  })
  @ApiQuery({
    name: 'page',
    description: 'Número de página',
    type: Number,
    example: 1,
    required: false,
  })
  @ApiQuery({
    name: 'pageSize',
    description: 'Cantidad de elementos por página',
    type: Number,
    example: 10,
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: 'Lista paginada de habitaciones',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              number: { type: 'number' },
              status: {
                type: 'string',
                enum: ['AVAILABLE', 'OCCUPIED', 'CLEANING', 'MAINTENANCE'],
              },
              tv: { type: 'boolean' },
              area: { type: 'number' },
              floorType: { type: 'string' },
              isActive: { type: 'boolean' },
              RoomTypes: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                  ImageRoomType: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      imageUrl: { type: 'string' },
                      isMain: { type: 'boolean' },
                    },
                  },
                },
              },
              trashBin: { type: 'boolean' },
              towel: { type: 'boolean' },
              toiletPaper: { type: 'boolean' },
              showerSoap: { type: 'boolean' },
              handSoap: { type: 'boolean' },
              lamp: { type: 'boolean' },
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
  ): Promise<PaginatedResponse<FindAllRoom>> {
    const pageNumber = parseInt(page, 10) || 1;
    const pageSizeNumber = parseInt(pageSize, 10) || 10;

    return this.roomService.findAllPaginated(user, {
      page: pageNumber,
      pageSize: pageSizeNumber,
    });
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

  // En room.controller.ts

  /**
   * Actualiza el estado de una habitación
   */
  @Patch(':id/status')
  @ApiOperation({ summary: 'Actualizar estado de una habitación' })
  @ApiParam({ name: 'id', description: 'ID de la habitación' })
  @ApiResponse({
    status: 200,
    description: 'Estado de habitación actualizado exitosamente',
    type: BaseApiResponse,
  })
  @ApiBadRequestResponse({
    description: 'ID inválido o estado no permitido',
  })
  updateStatus(
    @Param('id') id: string,
    @Body() statusDto: StatusRoomDto,
    @GetUser() user: UserData,
  ): Promise<BaseApiResponse<Room>> {
    return this.roomService.updateStatus(id, statusDto, user);
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

  /**
   * Cambia el estado de una habitación a CLEANING
   */
  @Patch(':id/cleaning')
  @ApiOperation({ summary: 'Cambiar estado de habitación a limpieza' })
  @ApiParam({ name: 'id', description: 'ID de la habitación' })
  @ApiOkResponse({
    description: 'Estado de habitación cambiado a limpieza exitosamente',
    type: BaseApiResponse,
  })
  @ApiNotFoundResponse({
    description: 'Habitación no encontrada',
  })
  updateStatusToCleaning(
    @Param('id') id: string,
  ): Promise<BaseApiResponse<Room>> {
    return this.roomService.updateStatusCleaning(id);
  }

  /**
   * Actualiza las amenities de una habitación
   */
  @Patch(':id/amenities')
  @ApiOperation({
    summary: 'Actualizar amenidades de una habitación',
    description:
      'Actualiza las amenidades de una habitación y ajusta automáticamente su estado según las amenidades',
  })
  @ApiParam({ name: 'id', description: 'ID de la habitación' })
  @ApiResponse({
    status: 200,
    description: 'Amenidades de la habitación actualizadas exitosamente',
    type: BaseApiResponse,
  })
  @ApiBadRequestResponse({
    description:
      'ID inválido, habitación no encontrada o datos de amenidades inválidos',
  })
  updateAmenities(
    @Param('id') id: string,
    @Body() updateAmenitiesRoomDto: UpdateAmenitiesRoomDto,
    @GetUser() user: UserData,
  ): Promise<BaseApiResponse<Room>> {
    return this.roomService.updateAmenities(id, updateAmenitiesRoomDto, user);
  }
}
