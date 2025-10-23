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
   * Obtiene habitaciones paginadas con filtros avanzados
   */
  @Get('paginated')
  @ApiOperation({
    summary: 'Obtener habitaciones paginadas con filtros avanzados',
    description:
      'Devuelve una lista paginada de habitaciones con filtros por estado, tipo de piso, estado activo y búsqueda en número, área y tipo de habitación',
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
  @ApiQuery({
    name: 'search',
    description:
      'Término de búsqueda en número de habitación, área y nombre del tipo de habitación',
    type: String,
    required: false,
  })
  @ApiQuery({
    name: 'isActive',
    description: 'Filtro por estado activo (array)',
    type: String,
    example: 'true,false',
    required: false,
  })
  @ApiQuery({
    name: 'status',
    description: 'Filtro por estado de habitación (array)',
    type: String,
    example: 'AVAILABLE,CLEANING',
    required: false,
  })
  @ApiQuery({
    name: 'floorType',
    description: 'Filtro por tipo de piso (array)',
    type: String,
    example: 'LAMINATING,CARPETING',
    required: false,
  })
  @ApiQuery({
    name: 'sortBy',
    description: 'Campo para ordenar',
    type: String,
    example: 'number',
    required: false,
  })
  @ApiQuery({
    name: 'sortOrder',
    description: 'Orden de clasificación',
    type: String,
    enum: ['asc', 'desc'],
    example: 'asc',
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
                enum: ['AVAILABLE', 'OCCUPIED', 'CLEANING', 'INCOMPLETE'],
              },
              tv: { type: 'boolean' },
              area: { type: 'number' },
              floorType: {
                type: 'string',
                enum: ['LAMINATING', 'CARPETING'],
              },
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
    @Query('search') search?: string,
    @Query('isActive') isActive?: string,
    @Query('status') status?: string,
    @Query('floorType') floorType?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
  ): Promise<PaginatedResponse<FindAllRoom>> {
    const pageNumber = parseInt(page, 10) || 1;
    const pageSizeNumber = parseInt(pageSize, 10) || 10;

    // Construir filtros
    const filterOptions: any = {};

    // Filtro por isActive (array booleano)
    if (isActive) {
      const isActiveArray = isActive.split(',').map((a) => a.trim() === 'true');
      filterOptions.arrayByField = {
        ...filterOptions.arrayByField,
        isActive: isActiveArray,
      };
    }

    // Filtro por status (array enum)
    if (status) {
      const statusArray = status.split(',').map((s) => s.trim());
      filterOptions.arrayByField = {
        ...filterOptions.arrayByField,
        status: statusArray,
      };
    }

    // Filtro por floorType (array enum)
    if (floorType) {
      const floorTypeArray = floorType.split(',').map((f) => f.trim());
      filterOptions.arrayByField = {
        ...filterOptions.arrayByField,
        floorType: floorTypeArray,
      };
    }

    // Búsqueda en habitación y tipo de habitación
    if (search) {
      // Usar OR a nivel superior para manejar búsquedas en múltiples campos
      filterOptions.OR = [
        // Búsqueda por número de habitación (convertir string a número si es posible)
        ...(parseInt(search) ? [{ number: parseInt(search) }] : []),
        // Búsqueda por área (convertir string a float si es posible)
        ...(parseFloat(search) ? [{ area: parseFloat(search) }] : []),
        // Búsqueda por nombre del tipo de habitación (relacional)
        {
          RoomTypes: {
            name: {
              contains: search,
              mode: 'insensitive',
            },
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

    return this.roomService.findAllPaginated(
      user,
      { page: pageNumber, pageSize: pageSizeNumber },
      filterOptions,
      sortOptions,
    );
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
