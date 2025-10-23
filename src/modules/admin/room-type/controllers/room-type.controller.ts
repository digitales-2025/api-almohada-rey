import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseInterceptors,
  UploadedFiles,
  BadRequestException,
  UploadedFile,
  Query,
} from '@nestjs/common';
import { RoomTypeService } from '../services/room-type.service';

import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiOkResponse,
  ApiNotFoundResponse,
  ApiConsumes,
  ApiBody,
  ApiQuery,
  getSchemaPath,
} from '@nestjs/swagger';

import {
  CreateRoomTypeDto,
  DeleteRoomTypeDto,
  UpdateRoomTypeWithImageDto,
  CreateRoomTypeWithImagesDto,
} from '../dto';
import { RoomType, SummaryRoomTypeData } from '../entities/room-type.entity';

import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { FormatDataInterceptor } from './format-data-update.interceptor';
import { FormatDataCreateInterceptor } from './format-data-create.interceptor';
import { Auth, GetUser } from '../../auth/decorators';
import { UserData, UserPayload } from 'src/interfaces';
import { BaseApiResponse } from 'src/utils/base-response/BaseApiResponse.dto';
import { PaginatedResponse } from 'src/utils/paginated-response/PaginatedResponse.dto';

/**
 * Controlador REST para gestionar tipos de habitaciones del hotel.
 * Expone endpoints para operaciones CRUD sobre tipos de habitaciones.
 */
@ApiTags('Admin Room Types')
@ApiBadRequestResponse({
  description:
    'Bad Request - Error en la validación de datos o solicitud incorrecta',
})
@ApiUnauthorizedResponse({
  description: 'Unauthorized - No autorizado para realizar esta operación',
})
@Controller({ path: 'room-types', version: '1' })
@Auth()
export class RoomTypeController {
  constructor(private readonly roomTypeService: RoomTypeService) {}

  /**
   * Obtiene todos los tipos de habitaciones
   */
  @Get()
  @ApiOperation({
    summary: 'Obtener todos los tipos de habitaciones con sus imágenes',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de todos los tipos de habitaciones con sus imágenes',
    type: [RoomType],
  })
  findAll(
    @GetUser() user: UserPayload,
  ): Promise<
    Array<RoomType & { imagesRoomType: Array<{ id: string; url: string }> }>
  > {
    return this.roomTypeService.findAll(user);
  }

  /**
   * Obtiene todos los tipos de habitaciones con paginación y filtros avanzados
   */
  @Get('paginated')
  @ApiOperation({
    summary: 'Obtener tipos de habitaciones paginados con filtros avanzados',
    description:
      'Devuelve una lista paginada de tipos de habitaciones con filtros por estado activo y búsqueda flexible en nombre, descripción y precio (OR)',
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
      'Término de búsqueda en nombre, descripción y precio del tipo de habitación (búsqueda flexible con OR)',
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
    name: 'sortBy',
    description: 'Campo para ordenar',
    type: String,
    example: 'name',
    required: false,
  })
  @ApiQuery({
    name: 'sortOrder',
    description: 'Orden de clasificación',
    type: String,
    enum: ['asc', 'desc'],
    example: 'desc',
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: 'Lista paginada de tipos de habitaciones con sus imágenes',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: {
            allOf: [
              { $ref: getSchemaPath(RoomType) },
              {
                type: 'object',
                properties: {
                  imagesRoomType: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        url: { type: 'string' },
                        isMain: { type: 'boolean' },
                      },
                    },
                  },
                },
              },
            ],
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
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
  ): Promise<
    PaginatedResponse<
      RoomType & { imagesRoomType: Array<{ id: string; url: string }> }
    >
  > {
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

    // Búsqueda simple en campos del tipo de habitación
    if (search) {
      // Usar OR a nivel superior para buscar en múltiples campos
      const orConditions = [
        // Búsqueda por nombre
        {
          name: {
            contains: search,
            mode: 'insensitive',
          },
        },
        // Búsqueda por descripción
        {
          description: {
            contains: search,
            mode: 'insensitive',
          },
        },
      ];

      // Búsqueda por precio (convertir string a número si es posible)
      const numericSearch = parseFloat(search);
      if (!isNaN(numericSearch)) {
        orConditions.push({
          price: numericSearch,
        } as any);
      }

      filterOptions.OR = orConditions;
    }

    // Construir opciones de ordenamiento
    const sortOptions: any = {};
    if (sortBy) {
      sortOptions.field = sortBy;
      sortOptions.order = sortOrder || 'desc';
    }

    return this.roomTypeService.findAllPaginated(
      user,
      { page: pageNumber, pageSize: pageSizeNumber },
      filterOptions,
      sortOptions,
    );
  }

  @Get('summary/active')
  @ApiOperation({
    summary: 'Obtener resumen de todos los tipos de habitaciones activas',
  })
  @ApiResponse({
    status: 200,
    description:
      'Lista resumida de los tipos de habitaciones activas (solo id, name e isActive)',
  })
  findAllActive(): Promise<SummaryRoomTypeData[]> {
    return this.roomTypeService.findAllActive();
  }

  /**
   * Obtiene un tipo de habitación por ID
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Obtener un tipo de habitación por ID sin imágenes',
  })
  @ApiResponse({
    status: 200,
    description: 'Tipo de habitación encontrado',
    type: RoomType,
  })
  @ApiNotFoundResponse({
    description: 'Tipo de habitación no encontrado',
  })
  findOne(@Param('id') id: string): Promise<RoomType> {
    return this.roomTypeService.findOne(id);
  }

  /**
   * Crea un nuevo tipo de habitación con imágenes
   */
  @Post('create-with-images')
  @ApiOperation({
    summary: 'Crear nuevo tipo de habitación con imágenes',
    description:
      'Permite crear un tipo de habitación con exactamente 5 imágenes requeridas.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: CreateRoomTypeWithImagesDto })
  @UseInterceptors(FilesInterceptor('images', 10), FormatDataCreateInterceptor) // Aumentamos el límite a 10 para validar manualmente
  async createWithImages(
    @Body() createRoomTypeDto: CreateRoomTypeDto,
    @UploadedFiles() images: Express.Multer.File[],
    @GetUser() user: UserData,
  ): Promise<BaseApiResponse<RoomType>> {
    // Validar que se hayan enviado exactamente 5 imágenes
    if (!images) {
      throw new BadRequestException(
        'Se requieren imágenes para crear un tipo de habitación.',
      );
    }

    if (images.length > 5) {
      throw new BadRequestException(
        'No se pueden enviar más de 5 imágenes para crear un tipo de habitación.',
      );
    }

    if (images.length < 5) {
      throw new BadRequestException(
        'Se requieren 5 imágenes como mínimo para crear un tipo de habitación.',
      );
    }

    return this.roomTypeService.createWithImages(
      createRoomTypeDto,
      images,
      user,
    );
  }

  /**
   * Actualizar tipo de habitación con imagen
   */
  @Patch(':id/update-with-images')
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: UpdateRoomTypeWithImageDto })
  @UseInterceptors(FileInterceptor('newImage'), FormatDataInterceptor)
  async updateWithImage(
    @Param('id') id: string,
    @Body() updateData: any,
    @UploadedFile() newImageFile: Express.Multer.File, // Cambio de nombre para evitar conflicto
    @GetUser() user: UserData,
  ): Promise<
    BaseApiResponse<
      RoomType & {
        imagesRoomType: Array<{ id: string; url: string; isMain: boolean }>;
      }
    >
  > {
    try {
      // 1. Extraer los datos del tipo de habitación (sin sobrescribir newImageFile)
      const { imageUpdate, ...updateRoomTypeDto } = updateData;

      // 2. Limpiar campos vacíos o nulos
      Object.keys(updateRoomTypeDto).forEach((key) => {
        if (
          updateRoomTypeDto[key] === '' ||
          updateRoomTypeDto[key] === null ||
          updateRoomTypeDto[key] === undefined
        ) {
          delete updateRoomTypeDto[key];
        }
      });

      // 3. Procesar datos de imagen si existen
      let processedImageUpdate = null;
      if (imageUpdate) {
        try {
          if (typeof imageUpdate === 'string') {
            processedImageUpdate = JSON.parse(imageUpdate);
          } else {
            processedImageUpdate = imageUpdate;
          }

          if (!processedImageUpdate.id) {
            throw new BadRequestException(
              'El objeto imageUpdate debe incluir la imagena a acualizar',
            );
          }
        } catch (error) {
          if (error instanceof BadRequestException) throw error;
          throw new BadRequestException(
            `Error procesando imageUpdate: ${error.message}`,
          );
        }
      }

      // 4. Llamar al servicio con los datos procesados (ojo al parámetro correcto)
      return this.roomTypeService.updateWithImage(
        id,
        user,
        updateRoomTypeDto,
        newImageFile || null, // Usar el parámetro correcto
        processedImageUpdate,
      );
    } catch (error) {
      console.error('Error en updateWithImage:', error);
      throw error;
    }
  }

  /**
   * Actualiza una imagen como principal para un tipo de habitación
   */
  @Patch(':id/update-main-image')
  @ApiOperation({
    summary: 'Establecer una imagen como principal para un tipo de habitación',
    description:
      'Actualiza cuál imagen es la principal para un tipo de habitación específico',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        imageUpdate: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'ID de la imagen' },
            url: { type: 'string', description: 'URL de la imagen' },
            isMain: {
              type: 'boolean',
              description: 'Debe ser true para establecer como principal',
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Imagen principal actualizada correctamente',
  })
  async updateMainImage(
    @Param('id') roomTypeId: string,
    @Body() data: { imageUpdate: { id: string; url: string; isMain: boolean } },
    @GetUser() user: UserData,
  ): Promise<BaseApiResponse<RoomType>> {
    if (!data.imageUpdate || !data.imageUpdate.id) {
      throw new BadRequestException('Se requiere un objeto imageUpdate válido');
    }

    // Asegurarse de que isMain sea true
    if (!data.imageUpdate.isMain) {
      throw new BadRequestException(
        'Para establecer como principal, isMain debe ser true',
      );
    }

    return this.roomTypeService.updateMainImage(
      roomTypeId,
      data.imageUpdate,
      user,
    );
  }

  /**
   * Desactiva múltiples tipos de habitaciones
   */
  @Delete('remove/all')
  @ApiOperation({
    summary: 'Desactivar múltiples tipos de habitaciones',
  })
  @ApiResponse({
    status: 200,
    description: 'Tipos de habitaciones desactivados exitosamente',
    type: BaseApiResponse<RoomType[]>,
  })
  @ApiBadRequestResponse({
    description: 'IDs inválidos o tipos de habitaciones no existen',
  })
  deleteMany(
    @Body() deleteRoomTypeDto: DeleteRoomTypeDto,
    @GetUser() user: UserData,
  ): Promise<BaseApiResponse<RoomType[]>> {
    return this.roomTypeService.deleteMany(deleteRoomTypeDto, user);
  }

  /**
   * Reactiva múltiples tipos de habitaciones
   */
  @Patch('reactivate/all')
  @ApiOperation({
    summary: 'Reactivar múltiples tipos de habitaciones',
  })
  @ApiOkResponse({
    description: 'Tipos de habitaciones reactivados exitosamente',
    type: BaseApiResponse<RoomType[]>,
  })
  @ApiBadRequestResponse({
    description: 'IDs inválidos o tipos de habitaciones no existen',
  })
  reactivateAll(
    @Body() deleteRoomTypeDto: DeleteRoomTypeDto,
    @GetUser() user: UserData,
  ): Promise<BaseApiResponse<RoomType[]>> {
    return this.roomTypeService.reactivateMany(deleteRoomTypeDto.ids, user);
  }

  /**
   * Obtiene un tipo de habitación por ID con sus imágenes
   */
  @Get(':id/with-images')
  @ApiOperation({ summary: 'Obtener tipo de habitación con imágenes por ID' })
  @ApiResponse({
    status: 200,
    description: 'Tipo de habitación encontrado con sus imágenes',
    type: RoomType,
  })
  @ApiNotFoundResponse({
    description: 'Tipo de habitación no encontrado',
  })
  async findOneWithImages(@Param('id') id: string): Promise<
    RoomType & {
      imagesRoomType: Array<{ id: string; url: string }>;
    }
  > {
    return this.roomTypeService.findOneWithImages(id);
  }
}
