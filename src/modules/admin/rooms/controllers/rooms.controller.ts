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

import {
  CreateRoomDto,
  UpdateRoomDto,
  DeleteRoomDto,
  UpdateRoomWithImagesDto,
  CreateRoomWithImagesDto,
} from '../dto';
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
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: CreateRoomWithImagesDto }) // Cambio aquí: usa el DTO en lugar del schema
  @UseInterceptors(FilesInterceptor('images'), FormatDataInterceptor)
  async createWithImages(
    @Body() createRoomDto: CreateRoomDto,
    @UploadedFiles() images: Express.Multer.File[],
    @GetUser() user: UserData,
  ): Promise<BaseApiResponse<Room>> {
    return this.roomsService.createWithImages(createRoomDto, images, user);
  }
  @Patch(':id/update-with-images')
  @ApiOperation({ summary: 'Actualizar habitación con imágenes' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: UpdateRoomWithImagesDto })
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
      // Limpiamos los campos vacíos o nulos
      Object.keys(updateRoomDto).forEach((key) => {
        if (
          updateRoomDto[key] === '' ||
          updateRoomDto[key] === null ||
          updateRoomDto[key] === undefined
        ) {
          delete updateRoomDto[key];
        }
      });

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
        updateRoomDto, // DTO limpiado
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
