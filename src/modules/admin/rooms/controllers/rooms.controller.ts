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
} from '@nestjs/common';
import { RoomsService } from '../services/rooms.service';

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
} from '@nestjs/swagger';

import { CreateRoomDto, UpdateRoomDto, DeleteRoomDto } from '../dto';
import { Room } from '../entities/rooms.entity';

import { FilesInterceptor } from '@nestjs/platform-express';
import { FormatDataInterceptor } from './format-data.interceptor';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { Auth, GetUser } from '../../auth/decorators';
import { UserData } from 'src/interfaces';
import { BaseApiResponse } from 'src/utils/base-response/BaseApiResponse.dto';

/**
 * Controlador REST para gestionar habitaciones del hotel.
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
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  /**
   * Obtiene todas las habitaciones
   */
  @Get()
  @ApiOperation({
    summary: 'Obtener todas las habitaciones',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de todas las habitaciones',
    type: [Room],
  })
  findAll(): Promise<Room[]> {
    return this.roomsService.findAll();
  }

  /**
   * Obtiene una habitación por ID
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Obtener una habitación por ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Habitación encontrada',
    type: Room,
  })
  @ApiNotFoundResponse({
    description: 'Habitación no encontrada',
  })
  findOne(@Param('id') id: string): Promise<Room> {
    return this.roomsService.findOne(id);
  }

  /**
   * Crea una nueva habitación con imágenes
   */
  @Post('create-with-images')
  @ApiOperation({
    summary: 'Crear nueva habitación con imágenes',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        number: {
          type: 'integer',
          example: 101,
        },
        guests: {
          type: 'integer',
          example: 2,
        },
        type: {
          type: 'string',
          enum: [
            'SINGLE',
            'DOUBLE_SINGLE',
            'DOUBLE_FAMILY',
            'SUITE',
            'MATRIMONIAL',
          ],
          example: 'DOUBLE_SINGLE',
        },
        price: {
          type: 'number',
          example: 150.5,
        },
        status: {
          type: 'string',
          enum: ['AVAILABLE', 'OCCUPIED', 'RESERVED', 'CLEANING'],
          example: 'AVAILABLE',
        },
        tv: {
          type: 'string',
          example: 'Smart TV 42 pulgadas',
        },
        floorType: {
          type: 'string',
          enum: ['LIMINATING', 'CARPETING'],
          example: 'LIMINATING',
        },
        description: {
          type: 'string',
          example: 'Habitación con vista al mar',
        },
        area: {
          type: 'number',
          example: 25.5,
        },
        images: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
          description: 'Imágenes de la habitación (opcional)',
        },
      },
      required: [
        'number',
        'guests',
        'type',
        'price',
        'status',
        'tv',
        'floorType',
        'description',
        'area',
      ],
    },
  })
  @UseInterceptors(FilesInterceptor('images'), FormatDataInterceptor)
  async createWithImages(
    @Body() createRoomDto: CreateRoomDto,
    @UploadedFiles() images: Express.Multer.File[],
    @GetUser() user: UserData,
  ): Promise<BaseApiResponse<Room>> {
    return this.roomsService.createWithImages(createRoomDto, images, user);
  }

  /**
   * Actualiza una habitación con sus imágenes
   */
  @Patch(':id/update-with-images')
  @ApiOperation({ summary: 'Actualizar habitación con imágenes' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        number: {
          type: 'integer',
          example: 101,
        },
        guests: {
          type: 'integer',
          example: 2,
        },
        type: {
          type: 'string',
          enum: [
            'SINGLE',
            'DOUBLE_SINGLE',
            'DOUBLE_FAMILY',
            'SUITE',
            'MATRIMONIAL',
          ],
        },
        price: {
          type: 'number',
          example: 150.5,
        },
        status: {
          type: 'string',
          enum: ['AVAILABLE', 'OCCUPIED', 'RESERVED', 'CLEANING'],
        },
        tv: {
          type: 'string',
          example: 'Smart TV 42 pulgadas',
        },
        floorType: {
          type: 'string',
          enum: ['LIMINATING', 'CARPETING'],
        },
        description: {
          type: 'string',
          example: 'Habitación con vista al mar',
        },
        area: {
          type: 'number',
          example: 25.5,
        },
        newImages: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
          description: 'Nuevas imágenes para agregar (opcional)',
        },
        imageUpdates: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              imageId: {
                type: 'string',
                example: '123e4567-e89b-12d3-a456-426614174000',
              },
              file: {
                type: 'string',
                format: 'binary',
              },
            },
          },
          description: 'Imágenes existentes a actualizar (opcional)',
        },
      },
    },
  })
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'newImages', maxCount: 10 },
      { name: 'imageUpdates', maxCount: 10 },
    ]),
    FormatDataInterceptor,
  )
  async updateWithImages(
    @Param('id') id: string,
    @Body() updateRoomDto: UpdateRoomDto,
    @UploadedFiles()
    files: {
      newImages?: Express.Multer.File[];
      imageUpdates?: Express.Multer.File[];
    },
    @Body('imageUpdates') imageUpdateData: string,
    @GetUser() user: UserData,
  ): Promise<
    BaseApiResponse<Room & { images: Array<{ id: string; url: string }> }>
  > {
    try {
      // Procesamos los datos de actualización de imágenes solo si existen
      let imageUpdates = [];
      if (imageUpdateData && files?.imageUpdates?.length) {
        try {
          const updateData = JSON.parse(imageUpdateData);
          imageUpdates = updateData
            .map((update, index) => ({
              imageId: update.imageId,
              file: files.imageUpdates[index],
            }))
            .filter((update) => update.file && update.imageId);
        } catch (parseError) {
          console.error(parseError);
        }
      }

      // Validamos si hay nuevas imágenes
      const newImages = files?.newImages?.length ? files.newImages : undefined;

      return this.roomsService.updateWithImages(
        id,
        user,
        updateRoomDto,
        newImages,
        imageUpdates.length > 0 ? imageUpdates : undefined,
      );
    } catch (error) {
      console.error('Error en updateWithImages:', error);
      throw error;
    }
  }

  /**
   * Desactiva múltiples habitaciones
   */
  @Delete('remove/all')
  @ApiOperation({
    summary: 'Desactivar múltiples habitaciones',
  })
  @ApiResponse({
    status: 200,
    description: 'Habitaciones desactivadas exitosamente',
    type: BaseApiResponse<Room[]>,
  })
  @ApiBadRequestResponse({
    description: 'IDs inválidos o habitaciones no existen',
  })
  deleteMany(
    @Body() deleteRoomDto: DeleteRoomDto,
    @GetUser() user: UserData,
  ): Promise<BaseApiResponse<Room[]>> {
    return this.roomsService.deleteMany(deleteRoomDto, user);
  }

  /**
   * Reactiva múltiples habitaciones
   */
  @Patch('reactivate/all')
  @ApiOperation({
    summary: 'Reactivar múltiples habitaciones',
  })
  @ApiOkResponse({
    description: 'Habitaciones reactivadas exitosamente',
    type: BaseApiResponse<Room[]>,
  })
  @ApiBadRequestResponse({
    description: 'IDs inválidos o habitaciones no existen',
  })
  reactivateAll(
    @Body() deleteRoomDto: DeleteRoomDto,
    @GetUser() user: UserData,
  ): Promise<BaseApiResponse<Room[]>> {
    return this.roomsService.reactivateMany(deleteRoomDto.ids, user);
  }

  /**
   * Obtiene una habitación por ID con sus imágenes
   */
  @Get(':id/with-images')
  @ApiOperation({ summary: 'Obtener habitación con imágenes por ID' })
  @ApiResponse({
    status: 200,
    description: 'Habitación encontrada con sus imágenes',
    type: Room,
  })
  @ApiNotFoundResponse({
    description: 'Habitación no encontrada',
  })
  async findOneWithImages(@Param('id') id: string): Promise<
    Room & {
      images: Array<{ id: string; url: string }>;
    }
  > {
    return this.roomsService.findOneWithImages(id);
  }
}
