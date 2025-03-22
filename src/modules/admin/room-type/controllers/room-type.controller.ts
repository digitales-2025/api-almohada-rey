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
} from '@nestjs/swagger';

import {
  CreateRoomTypeDto,
  DeleteRoomTypeDto,
  UpdateRoomTypeWithImageDto,
  CreateRoomTypeWithImagesDto,
} from '../dto';
import { RoomType } from '../entities/room-type.entity';

import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { FormatDataInterceptor } from './format-data-update.interceptor';
import { FormatDataCreateInterceptor } from './format-data-create.interceptor';
import { Auth, GetUser } from '../../auth/decorators';
import { UserData } from 'src/interfaces';
import { BaseApiResponse } from 'src/utils/base-response/BaseApiResponse.dto';

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
  findAll(): Promise<
    Array<RoomType & { images: Array<{ id: string; url: string }> }>
  > {
    return this.roomTypeService.findAll();
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
  @UseInterceptors(FilesInterceptor('images', 5), FormatDataCreateInterceptor)
  async createWithImages(
    @Body() createRoomTypeDto: CreateRoomTypeDto,
    @UploadedFiles() images: Express.Multer.File[],
    @GetUser() user: UserData,
  ): Promise<BaseApiResponse<RoomType>> {
    // Validar que se hayan enviado exactamente 5 imágenes
    if (!images || images.length !== 5) {
      throw new BadRequestException(
        'Se requieren exactamente 5 imágenes para crear un tipo de habitación. Por favor, cargue 5 imágenes.',
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
  @ApiOperation({
    summary: 'Actualizar tipo de habitación con una imagen',
    description:
      'Permite actualizar la información del tipo de habitación y una imagen específica.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: UpdateRoomTypeWithImageDto })
  @UseInterceptors(FileInterceptor('newImage'), FormatDataInterceptor)
  async updateWithImage(
    @Param('id') id: string,
    @Body() updateData: any,
    @UploadedFile() newImage: Express.Multer.File,
    @GetUser() user: UserData,
  ): Promise<
    BaseApiResponse<
      RoomType & { images: Array<{ id: string; url: string; isMain: boolean }> }
    >
  > {
    try {
      // 1. Extraer correctamente los datos del tipo de habitación excluyendo imageUpdate
      const { imageUpdate, newImage, ...updateRoomTypeDto } = updateData;

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
      return this.roomTypeService.updateWithImage(
        id,
        user,
        updateRoomTypeDto,
        newImage || null,
        processedImageUpdate,
      );
    } catch (error) {
      console.error('Error en updateWithImage:', error);
      throw error;
    }
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
      images: Array<{ id: string; url: string }>;
    }
  > {
    return this.roomTypeService.findOneWithImages(id);
  }
}
