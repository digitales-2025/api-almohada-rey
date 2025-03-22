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
} from '@nestjs/common';
import { RoomsService } from '../services/room-type.service';

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

import {
  CreateRoomDto,
  /*   UpdateRoomDto, */
  DeleteRoomDto,
  UpdateRoomWithImagesDto,
  CreateRoomWithImagesDto,
} from '../dto';
import { Room } from '../entities/room-type.entity';

import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { FormatDataInterceptor } from './format-data-update.interceptor';
import { FormatDataCreateInterceptor } from './format-data-create.interceptor';
/* import { FileFieldsInterceptor } from '@nestjs/platform-express'; */
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
    summary: 'Obtener todas las habitaciones con sus imágenes',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de todas las habitaciones con sus imágenes',
    type: [Room], // Idealmente, deberías crear un DTO específico que incluya imágenes
  })
  findAll(): Promise<
    Array<Room & { images: Array<{ id: string; url: string }> }>
  > {
    return this.roomsService.findAll();
  }

  /**
   * Obtiene una habitación por ID
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Obtener una habitación por ID sin imagenes',
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
    description:
      'Permite crear una habitación con exactamente 5 imágenes requeridas.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: CreateRoomWithImagesDto })
  @UseInterceptors(FilesInterceptor('images', 5), FormatDataCreateInterceptor)
  async createWithImages(
    @Body() createRoomDto: CreateRoomDto,
    @UploadedFiles() images: Express.Multer.File[],
    @GetUser() user: UserData,
  ): Promise<BaseApiResponse<Room>> {
    // Validar que se hayan enviado exactamente 5 imágenes
    if (!images || images.length !== 5) {
      throw new BadRequestException(
        'Se requieren exactamente 5 imágenes para crear una habitación. Por favor, cargue 5 imágenes.',
      );
    }

    return this.roomsService.createWithImages(createRoomDto, images, user);
  }

  /**
   * Actualizar habitación con imagen
   */
  @Patch(':id/update-with-images')
  @ApiOperation({
    summary: 'Actualizar habitación con una imagen',
    description:
      'Permite actualizar la información de la habitación y una imagen específica.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: UpdateRoomWithImagesDto })
  @UseInterceptors(FileInterceptor('newImage'), FormatDataInterceptor) // ¡Añadir FormatDataInterceptor aquí!
  async updateWithImage(
    @Param('id') id: string,
    @Body() updateData: any, // Cambiar a any para evitar validación estricta
    @UploadedFile() newImage: Express.Multer.File,
    @GetUser() user: UserData,
  ): Promise<
    BaseApiResponse<
      Room & { images: Array<{ id: string; url: string; isMain: boolean }> }
    >
  > {
    try {
      // 1. Extraer correctamente los datos de la habitación excluyendo imageUpdate
      const { imageUpdate, newImage, ...updateRoomDto } = updateData;

      // 2. Limpiar campos vacíos o nulos
      Object.keys(updateRoomDto).forEach((key) => {
        if (
          updateRoomDto[key] === '' ||
          updateRoomDto[key] === null ||
          updateRoomDto[key] === undefined
        ) {
          delete updateRoomDto[key];
        }
      });

      // 3. Procesar datos de imagen si existen
      let processedImageUpdate = null;
      if (imageUpdate) {
        try {
          // Si viene como string (común en multipart/form-data), lo parseamos
          if (typeof imageUpdate === 'string') {
            processedImageUpdate = JSON.parse(imageUpdate);
          } else {
            // Si ya viene como objeto, lo usamos directamente
            processedImageUpdate = imageUpdate;
          }

          // Validación básica
          if (!processedImageUpdate.imageId) {
            throw new BadRequestException(
              'El objeto imageUpdate debe incluir el imageId',
            );
          }
        } catch (error) {
          if (error instanceof BadRequestException) throw error;
          throw new BadRequestException(
            `Error procesando imageUpdate: ${error.message}`,
          );
        }
      }

      // 4. Llamar al servicio con los datos procesados
      return this.roomsService.updateWithImage(
        id,
        user,
        updateRoomDto,
        newImage || null,
        processedImageUpdate,
      );
    } catch (error) {
      console.error('Error en updateWithImage:', error);
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
